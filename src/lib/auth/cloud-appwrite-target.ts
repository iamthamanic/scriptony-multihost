/**
 * Cloud session (Axis 2) Appwrite target: Managed (.env) vs Self-Hosted (T41 store).
 * Does not change runtime.profile — local shell stays local.
 * Location: src/lib/auth/cloud-appwrite-target.ts
 */

import { SelfHostedConnectionStore } from "@/backend/self-hosted/SelfHostedConnectionStore";
import { trimEndpoint } from "@/backend/self-hosted/SelfHostedConnection";
import { resetAppwriteClient } from "@/lib/appwrite/client";
import { resetAuthClient } from "@/lib/auth/getAuthClient";
import {
  type AppwritePublicConfig,
  setCloudSessionAppwriteOverride,
  trimTrailingSlash,
  validateString,
} from "@/lib/env";

const env = import.meta.env;

export type CloudAuthTarget = "managed" | "selfHosted";

const TARGET_STORAGE_KEY = "scriptony_cloud_auth_target_v1";

export function getCloudAuthTarget(): CloudAuthTarget {
  if (typeof window === "undefined") return "managed";
  const raw = window.localStorage.getItem(TARGET_STORAGE_KEY);
  return raw === "selfHosted" ? "selfHosted" : "managed";
}

export function setCloudAuthTarget(target: CloudAuthTarget): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TARGET_STORAGE_KEY, target);
}

/** Managed Scriptony Cloud — from VITE_APPWRITE_* only. */
export function getManagedAppwriteConfig(): AppwritePublicConfig | null {
  const endpointRaw = validateString(env.VITE_APPWRITE_ENDPOINT);
  const projectId = validateString(env.VITE_APPWRITE_PROJECT_ID);
  if (!endpointRaw || !projectId) return null;
  return {
    endpoint: trimTrailingSlash(endpointRaw),
    projectId,
  };
}

export function getMissingManagedAppwriteConfig(): string[] {
  const missing: string[] = [];
  if (!validateString(env.VITE_APPWRITE_ENDPOINT)) {
    missing.push("VITE_APPWRITE_ENDPOINT");
  }
  if (!validateString(env.VITE_APPWRITE_PROJECT_ID)) {
    missing.push("VITE_APPWRITE_PROJECT_ID");
  }
  return missing;
}

/** Scriptony function gateway base URL from env (hybrid KI/TTS on desktop local). */
export function hasHybridFunctionsBaseUrl(): boolean {
  return Boolean(
    validateString(env.VITE_APPWRITE_FUNCTIONS_BASE_URL) ||
    validateString(env.VITE_BACKEND_API_BASE_URL),
  );
}

/** True when endpoint uses plain HTTP (warn in UI). */
export function isInsecureAppwriteEndpoint(endpoint: string): boolean {
  try {
    return new URL(trimEndpoint(endpoint)).protocol === "http:";
  } catch {
    return endpoint.trim().toLowerCase().startsWith("http://");
  }
}

/** Resolve config for the active cloud-auth target (async: reads T41 store). */
export async function resolveCloudAppwriteConfig(): Promise<AppwritePublicConfig | null> {
  if (getCloudAuthTarget() === "managed") {
    return getManagedAppwriteConfig();
  }
  const active = await new SelfHostedConnectionStore().getActive();
  if (!active) return null;
  return {
    endpoint: trimEndpoint(active.endpoint),
    projectId: active.projectId.trim(),
  };
}

export function getMissingCloudAppwriteConfig(
  target: CloudAuthTarget = getCloudAuthTarget(),
): string[] {
  if (target === "managed") {
    return getMissingManagedAppwriteConfig();
  }
  const active = new SelfHostedConnectionStore().getActiveSync();
  if (!active) {
    return ["Self-Host Server (speichern und aktivieren)"];
  }
  if (!active.endpoint.trim()) return ["Appwrite Endpoint"];
  if (!active.projectId.trim()) return ["Appwrite Project ID"];
  return [];
}

export function isCloudAuthConfigured(
  target: CloudAuthTarget = getCloudAuthTarget(),
): boolean {
  return getMissingCloudAppwriteConfig(target).length === 0;
}

/** Push resolved target into env override + reset SDK clients (Axis 2 only). */
export async function syncCloudAuthTargetToEnv(): Promise<void> {
  const cfg = await resolveCloudAppwriteConfig();
  setCloudSessionAppwriteOverride(cfg);
  resetAppwriteClient();
  resetAuthClient();
}
