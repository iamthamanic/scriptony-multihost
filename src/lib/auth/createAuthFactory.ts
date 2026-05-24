/**
 * Auth Factory
 *
 * Selects the concrete AuthClient implementation based on the runtime profile.
 * Keeps cloud and self-hosted using Appwrite while local mode uses a lightweight
 * no-op adapter.
 */

import type { RuntimeConfig } from "../../runtime/runtime-config";
import { AppwriteAuthAdapter } from "./AppwriteAuthAdapter";
import { LocalAuthAdapter } from "./LocalAuthAdapter";
import type { AuthClient } from "./AuthClient";

/**
 * Create an AuthClient appropriate for the detected runtime.
 *
 * - local     → LocalAuthAdapter (no login, no cloud)
 * - cloud     → AppwriteAuthAdapter (standard Appwrite login)
 * - selfHosted → AppwriteAuthAdapter with user-specified endpoint
 */
export function createAuthFactory(runtime: RuntimeConfig): AuthClient {
	if (runtime.profile === "local") {
		return new LocalAuthAdapter();
	}

	return new AppwriteAuthAdapter();
}
