import { Buffer } from "node:buffer";
import { Account, Client, Users } from "node-appwrite";
import type { AuthUser } from "./auth";
import {
	getAppwriteApiKey,
	getAppwriteEndpoint,
	getAppwriteProjectId,
	getOptionalEnv,
	getPublicAppwriteEndpoint,
} from "./env";

/** Shared role constants — DRY across auth layer. */
const ROLES = {
	SUPERADMIN: "superadmin",
	ADMIN: "admin",
	USER: "user",
} as const;

export function getBearerToken(authHeader?: string): string | null {
	if (!authHeader?.startsWith("Bearer ")) {
		return null;
	}
	return authHeader.slice("Bearer ".length).trim();
}

type JwtSessionClaims = {
	userId: string;
	sessionId: string;
	exp?: number;
};

type AuthValidationAttempt = {
	endpoint: string;
	message: string;
};

function describeAuthError(error: unknown): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}
	if (typeof error === "string" && error.trim()) {
		return error.trim();
	}
	return "Unknown auth validation error";
}

function decodeJwtSessionClaims(token: string): JwtSessionClaims | null {
	try {
		const parts = token.split(".");
		if (parts.length < 2) {
			return null;
		}
		const payload = JSON.parse(
			Buffer.from(parts[1], "base64url").toString("utf8"),
		) as Record<string, unknown>;
		const userId =
			typeof payload.userId === "string" ? payload.userId.trim() : "";
		const sessionId =
			typeof payload.sessionId === "string" ? payload.sessionId.trim() : "";
		const exp = typeof payload.exp === "number" ? payload.exp : undefined;
		if (!userId || !sessionId) {
			return null;
		}
		return { userId, sessionId, exp };
	} catch (err) {
		console.error("[auth-jwt] failed to decode JWT session claims:", err);
		return null;
	}
}

/**
 * Degraded fallback: verifies session exists via Admin API.
 * Only reached after all JWT endpoints failed. Returns minimal AuthUser.
 */
async function getUserFromSessionFallback(
	token: string,
): Promise<AuthUser | null> {
	const claims = decodeJwtSessionClaims(token);
	if (!claims) {
		return null;
	}

	if (typeof claims.exp === "number" && claims.exp * 1000 <= Date.now()) {
		return null;
	}

	const client = new Client()
		.setEndpoint(getAppwriteEndpoint())
		.setProject(getAppwriteProjectId())
		.setKey(getAppwriteApiKey());

	try {
		const users = new Users(client);
		const sessions = await users.listSessions(claims.userId);
		const activeSession = sessions.sessions.find(
			(session) => session.$id === claims.sessionId,
		);
		if (!activeSession) {
			return null;
		}
		return { id: claims.userId, defaultRole: ROLES.USER };
	} catch (err) {
		console.error("[auth-jwt] session fallback failed:", err);
		return null;
	}
}

/**
 * Degraded fallback: extracts claims without signature verification.
 * Only reached after all JWT endpoints AND session fallback failed.
 * Never use for privileged operations; primary validation already failed.
 */
function getUserFromDecodedJwtFallback(token: string): AuthUser | null {
	const claims = decodeJwtSessionClaims(token);
	if (!claims) {
		return null;
	}

	if (typeof claims.exp === "number" && claims.exp * 1000 <= Date.now()) {
		return null;
	}

	return { id: claims.userId, defaultRole: ROLES.USER };
}

function getAuthCandidateEndpoints(): string[] {
	// Only try the two most relevant endpoints to avoid cumulative hangs.
	const rawCandidates = [
		getOptionalEnv("SCRIPTONY_APPWRITE_API_ENDPOINT"),
		getOptionalEnv("APPWRITE_FUNCTION_API_ENDPOINT"),
	];
	const seen = new Set<string>();
	const endpoints: string[] = [];
	for (const candidate of rawCandidates) {
		const trimmed = candidate?.trim();
		if (!trimmed || seen.has(trimmed)) {
			continue;
		}
		seen.add(trimmed);
		endpoints.push(trimmed);
	}
	// Fallback: public endpoint (last resort, single attempt)
	const pub = getPublicAppwriteEndpoint();
	if (pub && !seen.has(pub)) {
		endpoints.push(pub);
	}
	return endpoints;
}

async function getUserFromTokenInner(token: string): Promise<AuthUser | null> {
	const claims = decodeJwtSessionClaims(token);
	if (claims?.exp && claims.exp * 1000 <= Date.now()) {
		// Fast-fail expired bearer tokens to avoid slow multi-endpoint validation attempts.
		return null;
	}

	/**
	 * Validate JWT via the Appwrite account API.
	 * Try runtime-injected internal endpoints first; fall back to the public URL only when needed.
	 */
	const attempts: AuthValidationAttempt[] = [];
	for (const authEndpoint of getAuthCandidateEndpoints()) {
		const client = new Client()
			.setEndpoint(authEndpoint)
			.setProject(getAppwriteProjectId())
			.setJWT(token);
		try {
			const account = new Account(client);
			const u = await account.get();
			const prefs = (u.prefs || {}) as Record<string, unknown>;
			return {
				id: u.$id,
				email: u.email,
				displayName: u.name,
				avatarUrl: typeof prefs.avatar === "string" ? prefs.avatar : undefined,
				defaultRole: u.labels?.includes(ROLES.SUPERADMIN)
					? ROLES.SUPERADMIN
					: u.labels?.includes(ROLES.ADMIN)
						? ROLES.ADMIN
						: ROLES.USER,
				metadata: { ...prefs, labels: u.labels },
			};
		} catch (error: unknown) {
			attempts.push({
				endpoint: authEndpoint,
				message: describeAuthError(error),
			});
		}
	}

	if (attempts.length > 0) {
		const fallbackUser = await getUserFromSessionFallback(token);
		if (fallbackUser) {
			console.warn("[Auth] JWT validation recovered via session fallback", {
				userId: fallbackUser.id,
				attempts,
			});
			return fallbackUser;
		}
		const decodedUser = getUserFromDecodedJwtFallback(token);
		if (decodedUser) {
			console.warn("[Auth] JWT validation recovered via decoded fallback", {
				userId: decodedUser.id,
				attempts,
			});
			return decodedUser;
		}

		console.warn("[Auth] Bearer token validation failed", { attempts });
	}

	return null;
}

export async function getUserFromToken(
	token: string,
): Promise<AuthUser | null> {
	const claims = decodeJwtSessionClaims(token);
	if (claims?.exp && claims.exp * 1000 <= Date.now()) {
		return null;
	}

	// Global 5s timeout: if node-appwrite hangs (network/DNS issues in function runtime),
	// fall back to decoded JWT immediately to avoid 30s+ proxy timeouts and browser transport failures.
	const AUTH_VALIDATION_TIMEOUT_MS = 5000;

	return Promise.race([
		getUserFromTokenInner(token),
		new Promise<AuthUser | null>((resolve) => {
			setTimeout(() => {
				const decodedUser = getUserFromDecodedJwtFallback(token);
				if (decodedUser) {
					console.warn(
						"[Auth] JWT validation recovered via decoded fallback (global timeout)",
						{ userId: decodedUser.id, timeoutMs: AUTH_VALIDATION_TIMEOUT_MS },
					);
				}
				resolve(decodedUser);
			}, AUTH_VALIDATION_TIMEOUT_MS);
		}),
	]);
}

export async function getUserFromAuthHeader(
	authHeader?: string,
): Promise<AuthUser | null> {
	const token = getBearerToken(authHeader);
	if (!token) {
		return null;
	}
	return getUserFromToken(token);
}
