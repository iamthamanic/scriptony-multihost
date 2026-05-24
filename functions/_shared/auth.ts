/**
 * Auth and bootstrap helpers barrel file.
 * Types and request-resolution logic.
 * Heavy JWT / integration / bootstrap modules split out.
 */

import type { RequestLike } from "./http";
import { ensureUserBootstrap } from "./auth-bootstrap";
import { getBearerToken, getUserFromAuthHeader } from "./auth-jwt";
import { resolveIntegrationToken } from "./auth-integration";

export interface AuthUser {
	id: string;
	email?: string;
	displayName?: string;
	avatarUrl?: string;
	defaultRole?: string;
	metadata?: Record<string, unknown>;
}

export interface BootstrapResult {
	user: AuthUser;
	organizationId: string;
}

export type AuthSource = string | RequestLike | undefined;

function getRequestHeaderValue(value: unknown): string | undefined {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed || undefined;
	}

	if (Array.isArray(value)) {
		for (const entry of value) {
			if (typeof entry === "string") {
				const trimmed = entry.trim();
				if (trimmed) {
					return trimmed;
				}
			}
		}
	}

	return undefined;
}

function getRequestHeader(
	req: RequestLike | undefined,
	name: string,
): string | undefined {
	if (!req || typeof req !== "object") {
		return undefined;
	}

	const reqHeader = (req as { header?: (name: string) => unknown }).header;
	if (typeof reqHeader === "function") {
		try {
			const fromReq = getRequestHeaderValue(reqHeader.call(req, name));
			if (fromReq) {
				return fromReq;
			}
		} catch {
			/* fall through to header map access */
		}
	}

	if (!req.headers || typeof req.headers !== "object") {
		return undefined;
	}

	const headers = req.headers as Record<string, unknown> & {
		get?: (name: string) => unknown;
		[Symbol.iterator]?: () => IterableIterator<[string, unknown]>;
	};
	const direct = getRequestHeaderValue(headers[name]);
	if (direct) {
		return direct;
	}

	if (typeof headers.get === "function") {
		try {
			const fromGetter = getRequestHeaderValue(headers.get(name));
			if (fromGetter) {
				return fromGetter;
			}
		} catch {
			/* fall through to iterable/object access */
		}
	}

	const normalizedName = name.toLowerCase();
	if (typeof headers[Symbol.iterator] === "function") {
		try {
			for (const entry of headers as Iterable<unknown>) {
				if (!Array.isArray(entry) || entry.length < 2) {
					continue;
				}
				const [headerName, headerValue] = entry;
				if (
					typeof headerName === "string" &&
					headerName.toLowerCase() === normalizedName
				) {
					return getRequestHeaderValue(headerValue);
				}
			}
		} catch {
			/* fall through to Object.entries */
		}
	}

	for (const [headerName, headerValue] of Object.entries(headers)) {
		if (headerName.toLowerCase() === normalizedName) {
			return getRequestHeaderValue(headerValue);
		}
	}

	return undefined;
}

export function getAuthorizationFromRequest(
	authSource: AuthSource,
): string | undefined {
	if (typeof authSource === "string") {
		const trimmed = authSource.trim();
		return trimmed || undefined;
	}

	const bearer = getRequestHeader(authSource, "authorization");
	if (bearer) {
		return bearer;
	}

	const appwriteJwt = getRequestHeader(authSource, "x-appwrite-user-jwt");
	if (appwriteJwt) {
		return `Bearer ${appwriteJwt}`;
	}

	return undefined;
}

export function getTrustedExecutionUserId(
	authSource: AuthSource,
): string | null {
	if (!authSource || typeof authSource === "string") {
		return null;
	}

	const executionId = getRequestHeader(authSource, "x-appwrite-execution-id");
	const userId = getRequestHeader(authSource, "x-appwrite-user-id");
	if (!executionId || !userId) {
		return null;
	}

	return userId;
}

export async function resolveAuthenticatedUser(
	authSource: AuthSource,
): Promise<AuthUser | null> {
	const authHeader = getAuthorizationFromRequest(authSource);

	let user = await getUserFromAuthHeader(authHeader);
	if (!user) {
		const token = getBearerToken(authHeader);
		if (token) {
			user = await resolveIntegrationToken(token);
		}
	}
	if (user) {
		return user;
	}

	const trustedUserId = getTrustedExecutionUserId(authSource);
	if (trustedUserId) {
		return { id: trustedUserId };
	}

	return null;
}

function authDiagnostics(
	authSource: AuthSource,
): Record<string, boolean | string | null> {
	const authorization =
		typeof authSource === "string"
			? authSource.trim() || undefined
			: getRequestHeader(authSource, "authorization");

	return {
		hasAuthorization: Boolean(authorization),
		authorizationScheme: authorization?.split(/\s+/, 1)[0] || null,
		hasAppwriteUserJwt: Boolean(
			getRequestHeader(
				authSource as RequestLike | undefined,
				"x-appwrite-user-jwt",
			),
		),
		hasTrustedExecutionId: Boolean(
			getRequestHeader(
				authSource as RequestLike | undefined,
				"x-appwrite-execution-id",
			),
		),
		hasTrustedUserId: Boolean(
			getRequestHeader(
				authSource as RequestLike | undefined,
				"x-appwrite-user-id",
			),
		),
	};
}

function logAuthResolutionFailure(authSource: AuthSource, scope: string): void {
	const diagnostics = authDiagnostics(authSource);
	if (
		!diagnostics.hasAuthorization &&
		!diagnostics.hasAppwriteUserJwt &&
		!diagnostics.hasTrustedExecutionId &&
		!diagnostics.hasTrustedUserId
	) {
		return;
	}

	console.warn("Unable to resolve user from auth source", {
		scope,
		diagnostics,
	});
}

export async function getUserFromRequest(
	authSource: AuthSource,
): Promise<AuthUser | null> {
	return resolveAuthenticatedUser(authSource);
}

export async function requireAuthenticatedUser(
	authSource?: AuthSource,
): Promise<AuthUser | null> {
	const user = await resolveAuthenticatedUser(authSource);
	if (!user) {
		logAuthResolutionFailure(authSource, "requireAuthenticatedUser");
		return null;
	}
	return user;
}

export { ensureUserBootstrap };

export async function requireUserBootstrap(
	authSource?: AuthSource,
): Promise<BootstrapResult | null> {
	const user = await requireAuthenticatedUser(authSource);
	if (!user) {
		return null;
	}
	return ensureUserBootstrap(user);
}
export {
	hashIntegrationToken,
	resolveIntegrationToken,
} from "./auth-integration";
export {
	getBearerToken,
	getUserFromToken,
	getUserFromAuthHeader,
} from "./auth-jwt";
export { requireAuth } from "./auth-http";
