/**
 * Auth client for Settings profile (desktop cloud session vs browser Appwrite user).
 * Location: src/lib/auth/account-settings-client.ts
 */

import { apiDelete, unwrapApiResult } from "@/lib/api-client";
import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";
import type { RuntimeConfig } from "@/runtime/runtime-config";
import type { AuthClient, AuthUserProfile } from "./AuthClient";
import { buildAuthProfileFromSession } from "./auth-profile";
import { prepareCloudAuthClient } from "./cloud-session";
import { getAuthClient } from "./getAuthClient";

export async function getAccountSettingsAuthClient(
  runtime: RuntimeConfig | null,
): Promise<AuthClient> {
  if (isLocalProfile()) {
    return prepareCloudAuthClient(runtime);
  }
  return getAuthClient(runtime ?? undefined);
}

export async function loadAccountSettingsProfile(
  runtime: RuntimeConfig | null,
): Promise<AuthUserProfile | null> {
  const client = await getAccountSettingsAuthClient(runtime);
  const session = await client.getSession();
  return buildAuthProfileFromSession(session);
}

/** Deletes cloud DB rows + Appwrite user via scriptony-auth (password verified server-side). */
export async function deleteCloudAccount(password: string): Promise<void> {
  const result = await apiDelete<{ success: boolean }>("/account", {
    password,
  });
  unwrapApiResult(result);
}
