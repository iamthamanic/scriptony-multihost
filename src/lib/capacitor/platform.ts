/**
 * Capacitor platform helpers.
 *
 * These functions keep native/mobile concerns isolated from the rest of the app.
 */

import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Preferences } from "@capacitor/preferences";
import { mapCallbackUrlToWebUrl } from "../shell/map-callback-url";

/** Preferences key for mirroring web session data on native (Capacitor). */
export const SCRIPTONY_NATIVE_SESSION_KEY = "scriptonyNativeSession";

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function getNativePlatform(): string {
  return Capacitor.getPlatform();
}

export async function hydrateNativeSessionStorage(): Promise<void> {
  if (!isNativePlatform() || typeof window === "undefined") {
    return;
  }

  try {
    const { value } = await Preferences.get({
      key: SCRIPTONY_NATIVE_SESSION_KEY,
    });
    if (value && !window.localStorage.getItem(SCRIPTONY_NATIVE_SESSION_KEY)) {
      window.localStorage.setItem(SCRIPTONY_NATIVE_SESSION_KEY, value);
    }
  } catch (error) {
    console.warn(
      "[Capacitor] Failed to hydrate native session storage:",
      error,
    );
  }
}

export async function persistNativeSessionStorage(
  value: string | null,
): Promise<void> {
  if (!isNativePlatform()) {
    return;
  }

  try {
    if (value) {
      await Preferences.set({ key: SCRIPTONY_NATIVE_SESSION_KEY, value });
    } else {
      await Preferences.remove({ key: SCRIPTONY_NATIVE_SESSION_KEY });
    }
  } catch (error) {
    console.warn(
      "[Capacitor] Failed to persist native session storage:",
      error,
    );
  }
}

/** @deprecated Use mapCallbackUrlToWebUrl from src/lib/shell/map-callback-url.ts */
export function mapNativeUrlToWebUrl(nativeUrl: string): string | null {
  return mapCallbackUrlToWebUrl(nativeUrl);
}

export async function installCapacitorUrlListener(): Promise<void> {
  if (!isNativePlatform() || typeof window === "undefined") {
    return;
  }

  await App.addListener("appUrlOpen", ({ url }) => {
    const targetUrl = mapCallbackUrlToWebUrl(url);
    if (targetUrl) {
      window.location.replace(targetUrl);
    }
  });
}
