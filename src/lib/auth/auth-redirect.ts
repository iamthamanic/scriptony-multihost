/**
 * OAuth and password-reset redirect targets by runtime shell.
 *
 * Desktop (Tauri) and native mobile (Capacitor) use the custom URL scheme
 * from env (`scriptony://auth-callback`). Browser uses the web origin.
 *
 * Location: src/lib/auth/auth-redirect.ts
 */

import type { RuntimeConfig } from "../../runtime/runtime-config";
import {
  getAuthRedirectUrl,
  getCapacitorCallbackUrl,
  getPasswordResetRedirectUrl,
} from "../env";
import { isNativePlatform } from "../capacitor/platform";

function usesCustomSchemeCallback(runtime: RuntimeConfig): boolean {
	return runtime.isDesktop || isNativePlatform();
}

/** Redirect URL for Appwrite OAuth success/failure. */
export function getOAuthRedirectTarget(runtime: RuntimeConfig): string {
  if (usesCustomSchemeCallback(runtime)) {
    return getCapacitorCallbackUrl();
  }
  return getAuthRedirectUrl();
}

/** Redirect URL for password reset emails. */
export function getPasswordResetRedirectTarget(runtime: RuntimeConfig): string {
  if (usesCustomSchemeCallback(runtime)) {
    return getCapacitorCallbackUrl("reset-password");
  }
  return getPasswordResetRedirectUrl();
}
