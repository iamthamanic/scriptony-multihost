/**
 * createBackend — Factory für ScriptonyBackend.
 *
 * T35: Switch auf Runtime-Profil (T34).
 * Liefert AppwriteBackend für cloud/selfHosted, LocalBackend für local.
 */

import type { ScriptonyBackend } from "./ScriptonyBackend";
import type { RuntimeConfig } from "@/runtime/runtime-config";

import { createAuthFactory } from "@/lib/auth/createAuthFactory";
import { AppwriteBackend } from "./appwrite/AppwriteBackend";
import { LocalBackend } from "./local/LocalBackend";

export function createBackend(runtime: RuntimeConfig): ScriptonyBackend {
	const auth = createAuthFactory(runtime);

	switch (runtime.profile) {
		case "local":
			return new LocalBackend(auth);

		case "cloud":
		case "selfHosted":
			return new AppwriteBackend(auth);

		default:
			// Defense in depth: unbekanntes Profil → Appwrite als Fallback.
			console.warn("[createBackend] Unknown runtime profile, falling back to Appwrite:", (runtime as RuntimeConfig).profile);
			return new AppwriteBackend(auth);
	}
}
