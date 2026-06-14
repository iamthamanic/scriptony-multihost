/**
 * Auth client factory (singleton).
 *
 * Returns the appropriate AuthClient implementation based on the current runtime profile:
 * - Local      → LocalAuthAdapter (no cloud account needed)
 * - Cloud      → AppwriteAuthAdapter (standard Appwrite login)
 * - SelfHosted → AppwriteAuthAdapter (custom endpoint via env)
 *
 * Configuration comes from `src/lib/env.ts` (`VITE_APPWRITE_*`).
 * Factory keeps call sites decoupled from the concrete adapter
 * (useful for tests via `resetAuthClient`).
 *
 * Location: src/lib/auth/getAuthClient.ts
 */

import { resetAppwriteClient } from "../appwrite/client";
import { getMissingAppwriteConfig } from "../env";
import { detectRuntime } from "../../runtime/detect-runtime";
import { createAuthFactory } from "./createAuthFactory";
import type { AuthClient } from "./AuthClient";
import type { RuntimeConfig } from "../../runtime/runtime-config";

let _client: AuthClient | null = null;
let _cachedRuntime: RuntimeConfig | null = null;

/**
 * Cache a runtime snapshot so that non-React call sites (e.g. api-client.ts,
 * getAuthToken.ts) can reuse the same config without duplicating detection.
 *
 * RuntimeProvider sets this once on mount; after that every `getAuthClient()`
 * call uses the cached value instead of re-running `detectRuntime()`.
 */
export function setAuthRuntime(runtime: RuntimeConfig): void {
  if (_cachedRuntime && _cachedRuntime.profile !== runtime.profile) {
    _client = null;
  }
  _cachedRuntime = runtime;
}

/**
 * Get the auth client singleton.
 *
 * @param runtime optional — when supplied, the factory uses it directly.
 *   When omitted, the function falls back to:
 *   1. a runtime previously cached by `setAuthRuntime()` (set by RuntimeProvider)
 *   2. `detectRuntime()` as last resort (for code outside React, e.g. api-client)
 *
 * This keeps RuntimeProvider as the Single Source of Truth while preserving
 * backwards compatibility for non-React callers.
 */
export function getAuthClient(runtime?: RuntimeConfig): AuthClient {
  if (_client) return _client;

  const effectiveRuntime = runtime ?? _cachedRuntime ?? detectRuntime();

  // Appwrite-based profiles still need a valid endpoint configuration.
  if (effectiveRuntime.profile !== "local") {
    const missing = getMissingAppwriteConfig();
    if (missing.length > 0) {
      throw new Error(`Appwrite auth requires: ${missing.join(", ")}`);
    }
  }

  _client = createAuthFactory(effectiveRuntime);
  return _client;
}

/**
 * Reset the singleton (useful for testing or hot-reload during runtime switching).
 */
export function resetAuthClient(): void {
  _client = null;
  _cachedRuntime = null;
  resetAppwriteClient();
}
