/**
 * Server-side environment for Scriptony HTTP functions (Node / Appwrite Functions).
 *
 * Appwrite-URL für Calls von der Function zum Appwrite-Server:
 * - Setze `SCRIPTONY_APPWRITE_API_ENDPOINT` in der Function-Console (pro Function),
 *   nicht nur lokal — sonst Drift zwischen Functions und über Deploys.
 * - Self-hosted im gleichen Netz wie Appwrite: oft `http://appwrite/v1`.
 * - `npm run appwrite:sync:function-appwrite-endpoint` schreibt diese Variable
 *   bulk aus `.env.local`; kann interne Overrides überschreiben — vor Sync prüfen.
 * Siehe `functions/README.md` (Optional env + Verify).
 */

import process from "node:process";

function trimTrailingSlash(value: string): string {
	return value.replace(/\/+$/, "");
}

export function getOptionalEnv(name: string): string | null {
	const value = process.env[name]?.trim();
	return value ? value : null;
}

export function getRequiredEnv(name: string): string {
	const value = getOptionalEnv(name);
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

/**
 * Server-to-server Appwrite endpoint (Functions runtime → Appwrite `/v1`).
 *
 * Resolution order:
 * 1. `SCRIPTONY_APPWRITE_API_ENDPOINT` — bevorzugter Override (Console / Sync-Skript).
 * 2. `APPWRITE_FUNCTION_API_ENDPOINT` wenn gesetzt und **nicht** die interne Form
 *    `…/appwrite/v1` (diese wird übersprungen und führt zu Fallback unten).
 * 3. Hardcoded Fallback — temporär; in Deployments durch passende Env-Vars ersetzen.
 */
export function getAppwriteEndpoint(): string {
	// 1) Explicit override (highest priority)
	const custom = getOptionalEnv("SCRIPTONY_APPWRITE_API_ENDPOINT");
	if (custom) return trimTrailingSlash(custom);

	// 2) Hardcoded Docker-internal endpoint — the only URL reachable from Function runtime
	return "http://appwrite/v1";
}

/** Public endpoint for URLs returned to the browser. */
export function getPublicAppwriteEndpoint(): string {
	const pub =
		getOptionalEnv("APPWRITE_PUBLIC_ENDPOINT") ||
		getOptionalEnv("APPWRITE_ENDPOINT");
	if (pub) return trimTrailingSlash(pub);
	return getAppwriteEndpoint();
}

export function getAppwriteProjectId(): string {
	return (
		getOptionalEnv("APPWRITE_FUNCTION_PROJECT_ID") ||
		getOptionalEnv("APPWRITE_PROJECT_ID") ||
		"69c04993003de8ff42aa"
	);
}

export function getAppwriteApiKey(): string {
	return getOptionalEnv("APPWRITE_API_KEY") || "";
}

export function getAppwriteDatabaseId(): string {
	return getOptionalEnv("APPWRITE_DATABASE_ID") || "scriptony";
}

export type StorageBucketKind =
	| "general"
	| "projectImages"
	| "worldImages"
	| "shotImages"
	| "stageDocuments"
	| "audioFiles";

const STORAGE_BUCKET_DEFAULTS: Record<StorageBucketKind, string> = {
	general: "general",
	projectImages: "project-images",
	worldImages: "world-images",
	shotImages: "shots",
	stageDocuments: "stage-documents",
	audioFiles: "audio-files",
};

export function getStorageBucketId(kind: StorageBucketKind): string {
	const envMap: Record<StorageBucketKind, string> = {
		general: "SCRIPTONY_STORAGE_BUCKET_GENERAL",
		projectImages: "SCRIPTONY_STORAGE_BUCKET_PROJECT_IMAGES",
		worldImages: "SCRIPTONY_STORAGE_BUCKET_WORLD_IMAGES",
		shotImages: "SCRIPTONY_STORAGE_BUCKET_SHOT_IMAGES",
		stageDocuments: "SCRIPTONY_STORAGE_BUCKET_STAGE_DOCUMENTS",
		audioFiles: "SCRIPTONY_STORAGE_BUCKET_AUDIO_FILES",
	};

	return getOptionalEnv(envMap[kind]) || STORAGE_BUCKET_DEFAULTS[kind];
}

export function getDemoUserCredentials(): {
	email: string;
	password: string;
} {
	return {
		email: getOptionalEnv("SCRIPTONY_DEMO_USER_EMAIL") || "",
		password: getOptionalEnv("SCRIPTONY_DEMO_USER_PASSWORD") || "",
	};
}
