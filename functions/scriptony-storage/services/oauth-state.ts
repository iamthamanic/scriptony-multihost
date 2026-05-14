/**
 * OAuth state signing/verification für CSRF-Schutz.
 * HMAC-SHA256 mit installationsspezifischem Secret.
 */

import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getOptionalEnv, getRequiredEnv } from "../../_shared/env";

function getSecret(): string {
	return (
		getOptionalEnv("scriptony_oauth_state_secret") ||
		getRequiredEnv("APPWRITE_API_KEY")
	);
}

function signState(payload: string): string {
	return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function buildState(
	redirectUri: string,
	provider: string,
	userId: string,
): string {
	const payload = Buffer.from(
		JSON.stringify({ redirect_uri: redirectUri, provider, user_id: userId }),
		"utf8",
	).toString("base64url");
	return `${payload}.${signState(payload)}`;
}

export function parseState(state: string): {
	redirect_uri: string;
	provider: string;
	user_id: string;
} | null {
	const parts = state.split(".");
	if (parts.length !== 2) return null;
	const [payload, sig] = parts;
	const expected = signState(payload);
	if (sig.length !== expected.length) return null;
	try {
		if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
	} catch {
		return null;
	}
	try {
		return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
	} catch {
		return null;
	}
}
