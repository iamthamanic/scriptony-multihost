import { getAppwritePublicConfig } from "../lib/env";
import type { RuntimeConfig } from "./runtime-config";
import type { RuntimeProfile } from "./runtime-profile";

interface WindowWithTauri extends Window {
  __TAURI__?: unknown;
  __TAURI_IPC__?: unknown;
  __TAURI_INTERNALS__?: unknown;
}

interface WindowWithElectron extends Window {
  process?: {
    versions?: { electron?: string };
  };
}

/** True when running inside a Tauri/Electron desktop shell. */
export function isDesktopShell(): boolean {
  if (typeof window === "undefined") return false;

  const w = window as WindowWithTauri & WindowWithElectron;

  const hasTauri =
    w.__TAURI__ !== undefined ||
    w.__TAURI_IPC__ !== undefined ||
    w.__TAURI_INTERNALS__ !== undefined;

  const hasElectron = w.process?.versions?.electron !== undefined;

  return hasTauri || hasElectron;
}

function buildRuntimeConfig(
  profile: RuntimeProfile,
  overrides: Partial<RuntimeConfig> = {},
): RuntimeConfig {
  const desktop = isDesktopShell();
  const appwriteConfig = getAppwritePublicConfig();

  return {
    profile,
    isDesktop: desktop,
    isBrowser: !desktop,
    isMobile: false,
    appwriteEndpoint: appwriteConfig?.endpoint,
    appwriteProjectId: appwriteConfig?.projectId,
    ...overrides,
  };
}

/**
 * Detect the current runtime environment at app start.
 *
 * Priority:
 * 1. Explicit VITE_SCRIPTONY_RUNTIME env override (local | cloud | selfHosted)
 * 2. Default cloud (browser and Tauri desktop until local mode is product-ready)
 *
 * Cloud remains the safe default so existing users are never disrupted.
 * Tauri does not auto-switch to local — set VITE_SCRIPTONY_RUNTIME=local explicitly.
 */
export function detectRuntime(): RuntimeConfig {
  const explicitRuntime = import.meta.env.VITE_SCRIPTONY_RUNTIME;

  if (explicitRuntime === "local") {
    if (isDesktopShell()) {
      return buildRuntimeConfig("local");
    }

    if (
      import.meta.env.DEV &&
      import.meta.env.VITE_SCRIPTONY_ALLOW_BROWSER_LOCAL === "1"
    ) {
      console.warn(
        "[Scriptony] Browser dev-local mode activated. " +
          "Auth is bypassed; do not use in production.",
      );
      return buildRuntimeConfig("local", {
        isDesktop: false,
        isBrowser: true,
      });
    }

    console.warn(
      "[Scriptony] VITE_SCRIPTONY_RUNTIME=local was set but no desktop shell was detected. " +
        "Falling back to cloud mode. If you intended to run the desktop app, " +
        "ensure Tauri or Electron APIs are loaded. " +
        "For browser dev testing, set VITE_SCRIPTONY_ALLOW_BROWSER_LOCAL=1.",
    );
  }

  if (explicitRuntime === "selfHosted") {
    const appwriteConfig = getAppwritePublicConfig();
    return buildRuntimeConfig("selfHosted", {
      selfHostedEndpoint: appwriteConfig?.endpoint,
    });
  }

  return buildRuntimeConfig("cloud");
}
