/**
 * Cloud session helpers (Axis 2) — JWT present vs Appwrite configured.
 * Location: src/lib/auth/cloud-session.ts
 *
 * On desktop local profile, use getCloudAuthClient() — not LocalAuthAdapter.
 */

import { canUseCloudFeatures } from "@/lib/api-adapter/runtime-dispatch";
import { detectRuntime } from "@/runtime/detect-runtime";
import type { RuntimeConfig } from "@/runtime/runtime-config";
import { createAuthFactory } from "./createAuthFactory";
import type { AuthClient } from "./AuthClient";
import { LOCAL_DEV_BEARER } from "./local-dev-token";
import { getMissingAppwriteConfig } from "../env";
import { getOAuthRedirectTarget } from "./auth-redirect";

/** Runtime snapshot for Appwrite auth while shell stays local. */
export function createCloudRuntimeConfig(
  base?: RuntimeConfig | null,
): RuntimeConfig {
  const runtime = base ?? detectRuntime();
  return { ...runtime, profile: "cloud" };
}

/** Appwrite auth client — independent of local profile LocalAuthAdapter. */
export function getCloudAuthClient(base?: RuntimeConfig | null): AuthClient {
  const missing = getMissingAppwriteConfig();
  if (missing.length > 0) {
    throw new Error(`Appwrite auth requires: ${missing.join(", ")}`);
  }
  return createAuthFactory(createCloudRuntimeConfig(base));
}

/** @internal Exported for unit testing. */
export function isRealCloudToken(token: string | null): boolean {
  if (!token) return false;
  if (token === LOCAL_DEV_BEARER) return false;
  if (token.startsWith("local_")) return false;
  return true;
}

/** Resolves a real Appwrite JWT, or null if unavailable. */
export async function getCloudAccessToken(
  base?: RuntimeConfig | null,
): Promise<string | null> {
  try {
    const token = await getCloudAuthClient(base).getAccessToken();
    return isRealCloudToken(token) ? token : null;
  } catch (err) {
    console.warn("[cloud-session] getAccessToken failed:", err);
    return null;
  }
}

/** True when the user has an Appwrite session (JWT), including after desktop login. */
export async function canUseCloudSession(
  base?: RuntimeConfig | null,
): Promise<boolean> {
  return (await getCloudAccessToken(base)) !== null;
}

/** Start OAuth login for the cloud session (desktop local profile). DRY: one place for redirect config. */
export async function initiateCloudOAuthLogin(
  runtime?: RuntimeConfig | null,
): Promise<void> {
  const cloudAuth = getCloudAuthClient(runtime);
  await cloudAuth.signInWithOAuth("google", {
    redirectTo: getOAuthRedirectTarget(createCloudRuntimeConfig(runtime)),
  });
}

/** Session + Appwrite endpoint/project configured — required for sync activation and some hybrid APIs. */
export async function canUseCloudSessionAndConfig(): Promise<boolean> {
  if (!(await canUseCloudSession())) return false;
  return canUseCloudFeatures();
}
