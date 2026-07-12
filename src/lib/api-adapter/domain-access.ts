/**
 * Domain access gate — when UI needs Cloud JWT vs local project session (T60).
 *
 * Location: src/lib/api-adapter/domain-access.ts
 */

import { getCloudAccessToken } from "@/lib/auth/cloud-session";
import { isDesktopShell } from "@/runtime/detect-runtime";
import { getOpenLocalProjectId, isLocalProfile } from "./runtime-dispatch";

export const CLOUD_AUTH_REQUIRED_MESSAGE = "Scriptony Cloud: Anmeldung nötig";

export class DomainAccessError extends Error {
  readonly code = "CLOUD_AUTH_REQUIRED" as const;

  constructor(message = CLOUD_AUTH_REQUIRED_MESSAGE) {
    super(message);
    this.name = "DomainAccessError";
  }
}

/** True when a local .scriptony project session is open on the active backend. */
export function hasOpenLocalProject(): boolean {
  return Boolean(getOpenLocalProjectId());
}

/**
 * Domain CRUD uses Cloud HTTP unless desktop-local with an open project.
 * Cloud-only features (KI, TTS, Storage) should call requireCloudAuthToken directly.
 */
export function usesCloudHttpForDomain(): boolean {
  return !(isLocalProfile() && isDesktopShell() && hasOpenLocalProject());
}

/** Throws when Cloud HTTP is required but no Appwrite session exists. */
export async function requireCloudAuthToken(): Promise<string> {
  const token = await getCloudAccessToken();
  if (!token) {
    throw new DomainAccessError();
  }
  return token;
}

/**
 * Resolves auth for domain timeline/structure APIs.
 * Local desktop + open project → undefined (API routes via isLocalProfile).
 * Cloud → JWT or DomainAccessError.
 */
export async function resolveDomainAuthToken(): Promise<string | undefined> {
  if (!usesCloudHttpForDomain()) {
    return undefined;
  }
  return requireCloudAuthToken();
}

/** Bearer token for APIs that still accept a token param on cloud paths. */
export async function resolveDomainAuthTokenOrEmpty(): Promise<string> {
  const token = await resolveDomainAuthToken();
  return token ?? "";
}
