/**
 * Runtime dispatch — single place for local vs cloud routing (T53/T55).
 *
 * Location: src/lib/api-adapter/runtime-dispatch.ts
 */

import { getBackendInstance } from "@/backend/backend-instance";
import type { ScriptonyBackend } from "@/backend/ScriptonyBackend";
import type { LocalBackend } from "@/backend/local/LocalBackend";
import { detectRuntime, isDesktopShell } from "@/runtime/detect-runtime";
import type { RuntimeProfile } from "@/runtime/runtime-profile";
import {
  getCloudAuthTarget,
  hasHybridFunctionsBaseUrl,
} from "@/lib/auth/cloud-appwrite-target";
import { getAppwritePublicConfig, getBackendRuntimeProfile } from "@/lib/env";

/** Active profile from RuntimeProvider; falls back to env/shell detection before hydrate. */
export function getRuntimeProfile(): RuntimeProfile {
  return getBackendRuntimeProfile() ?? detectRuntime().profile;
}

export function isLocalProfile(): boolean {
  return getRuntimeProfile() === "local";
}

export function isCloudProfile(): boolean {
  const p = getRuntimeProfile();
  return p === "cloud" || p === "selfHosted";
}

/** True when Appwrite endpoint + project are configured. */
export function canUseCloudFeatures(): boolean {
  if (!isCloudProfile() && !isLocalProfile()) return false;
  const cfg = getAppwritePublicConfig();
  return Boolean(cfg?.endpoint && cfg?.projectId);
}

/**
 * Hybrid KI/TTS: auth endpoint plus (on desktop local + self-host target) functions base URL in .env.
 */
export function canUseHybridFeatures(): boolean {
  if (!canUseCloudFeatures()) return false;
  if (isLocalProfile() && getCloudAuthTarget() === "selfHosted") {
    return hasHybridFunctionsBaseUrl();
  }
  return true;
}

export function getActiveBackend(): ScriptonyBackend | null {
  return getBackendInstance();
}

export function requireLocalBackend(expectedProjectId?: string): LocalBackend {
  const backend = getActiveBackend();
  if (!backend || !isLocalProfile()) {
    throw new Error("Local backend is not available.");
  }
  if (!("localProject" in backend)) {
    throw new Error("Open a local .scriptony project first.");
  }
  const local = backend as LocalBackend;
  if (expectedProjectId && local.localProject.projectId !== expectedProjectId) {
    throw new Error(
      "Geöffnetes lokales Projekt stimmt nicht mit der angeforderten Projekt-ID überein.",
    );
  }
  return local;
}

export function getOpenLocalProjectId(): string | null {
  const backend = getActiveBackend();
  if (backend && "localProject" in backend) {
    return (backend as LocalBackend).localProject.projectId;
  }
  return null;
}

export async function dispatchByRuntime<T>(
  cloud: () => Promise<T>,
  local: () => Promise<T>,
): Promise<T> {
  if (isLocalProfile() && isDesktopShell()) {
    return local();
  }
  return cloud();
}

export function localNotSupported(message: string): never {
  throw new Error(message);
}
