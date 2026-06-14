/**
 * Cloud session helpers (Axis 2) — JWT present vs Appwrite configured.
 * Location: src/lib/auth/cloud-session.ts
 *
 * On desktop local profile, use prepareCloudAuthClient() — not LocalAuthAdapter.
 */

import { canUseCloudFeatures } from "@/lib/api-adapter/runtime-dispatch";
import { detectRuntime } from "@/runtime/detect-runtime";
import type { RuntimeConfig } from "@/runtime/runtime-config";
import { createAuthFactory } from "./createAuthFactory";
import type { AuthClient } from "./AuthClient";
import { LOCAL_DEV_BEARER } from "./local-dev-token";
import { getPasswordResetRedirectTarget } from "./auth-redirect";
import {
  getMissingCloudAppwriteConfig,
  syncCloudAuthTargetToEnv,
} from "./cloud-appwrite-target";

/** Runtime snapshot for Appwrite auth while shell stays local. */
export function createCloudRuntimeConfig(
  base?: RuntimeConfig | null,
): RuntimeConfig {
  const runtime = base ?? detectRuntime();
  return { ...runtime, profile: "cloud" };
}

async function createCloudAuthClient(
  base?: RuntimeConfig | null,
): Promise<AuthClient> {
  await syncCloudAuthTargetToEnv();
  const missing = getMissingCloudAppwriteConfig();
  if (missing.length > 0) {
    throw new Error(`Appwrite auth requires: ${missing.join(", ")}`);
  }
  return createAuthFactory(createCloudRuntimeConfig(base));
}

/** Appwrite auth client after syncing cloud-auth target to env. */
export async function prepareCloudAuthClient(
  base?: RuntimeConfig | null,
): Promise<AuthClient> {
  return createCloudAuthClient(base);
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
    const token = await (await createCloudAuthClient(base)).getAccessToken();
    return isRealCloudToken(token) ? token : null;
  } catch (err) {
    console.warn("[cloud-session] getAccessToken failed:", err);
    return null;
  }
}

const CLOUD_SESSION_PROBE_MS = 4_000;

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | "timeout"> {
  return Promise.race([
    promise,
    new Promise<"timeout">((resolve) => {
      setTimeout(() => resolve("timeout"), ms);
    }),
  ]);
}

/**
 * True when an Appwrite cookie session exists.
 * Uses account.get only (no JWT) + timeout so the header icon does not spin on slow/offline hosts.
 */
export async function canUseCloudSession(
  base?: RuntimeConfig | null,
): Promise<boolean> {
  try {
    const client = await createCloudAuthClient(base);
    const result = await withTimeout(
      client.hasActiveSession(),
      CLOUD_SESSION_PROBE_MS,
    );
    if (result === "timeout") {
      console.warn(
        `[cloud-session] session probe timed out after ${CLOUD_SESSION_PROBE_MS}ms`,
      );
      return false;
    }
    return result;
  } catch (err) {
    console.warn("[cloud-session] canUseCloudSession:", err);
    return false;
  }
}

/** Email/password login for Axis 2 (desktop local shell, cloud profile auth). */
export async function signInToCloudSession(
  email: string,
  password: string,
  base?: RuntimeConfig | null,
): Promise<void> {
  const client = await createCloudAuthClient(base);
  await client.signInWithPassword(email, password);
}

/** Register a new Appwrite account for the cloud session. */
export async function signUpToCloudSession(
  email: string,
  password: string,
  displayName: string,
  base?: RuntimeConfig | null,
): Promise<void> {
  const client = await createCloudAuthClient(base);
  const session = await client.signUp(email, password, {
    displayName,
  });
  if (!session) {
    throw new Error(
      "Konto erstellt. Bitte E-Mail bestätigen oder erneut anmelden.",
    );
  }
}

/** Password reset e-mail (Appwrite recovery). */
export async function requestCloudPasswordReset(
  email: string,
  base?: RuntimeConfig | null,
): Promise<void> {
  const runtime = createCloudRuntimeConfig(base);
  const client = await createCloudAuthClient(base);
  await client.resetPasswordForEmail(
    email,
    getPasswordResetRedirectTarget(runtime),
  );
}

/** Session + Appwrite endpoint/project configured — required for sync activation and some hybrid APIs. */
export async function canUseCloudSessionAndConfig(): Promise<boolean> {
  if (!(await canUseCloudSession())) return false;
  return canUseCloudFeatures();
}
