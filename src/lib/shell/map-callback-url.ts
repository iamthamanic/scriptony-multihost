/**
 * Maps custom-scheme auth callbacks (scriptony://auth-callback) to the web app origin.
 *
 * Shared by Capacitor and Tauri deep-link handlers.
 *
 * Location: src/lib/shell/map-callback-url.ts
 */

import { backendConfig } from "../env";

/**
 * Convert a native/custom-scheme URL to an in-app web URL on the current origin.
 */
export function mapCallbackUrlToWebUrl(nativeUrl: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const parsed = new URL(nativeUrl);
    const { urlScheme, callbackHost } = backendConfig.capacitor;
    const expectedProtocol = `${urlScheme}:`;

    if (parsed.protocol !== expectedProtocol) {
      return null;
    }

    if (parsed.hostname !== callbackHost) {
      return null;
    }
    const path =
      parsed.host && parsed.host !== callbackHost
        ? `/${parsed.host}${parsed.pathname === "/" ? "" : parsed.pathname}`
        : parsed.pathname === "/"
          ? ""
          : parsed.pathname;

    return `${window.location.origin}${path}${parsed.search}${parsed.hash}`;
  } catch (error) {
    console.warn("[Shell] Failed to map callback URL:", nativeUrl, error);
    return null;
  }
}
