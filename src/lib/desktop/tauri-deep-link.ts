/**
 * Tauri deep-link listener for OAuth and password-reset callbacks.
 *
 * Registers only inside the Tauri desktop shell; no-op on web builds.
 *
 * Location: src/lib/desktop/tauri-deep-link.ts
 */

import { isDesktopShell } from "../../runtime/detect-runtime";
import { mapCallbackUrlToWebUrl } from "../shell/map-callback-url";

function navigateToMappedCallback(url: string): void {
  const targetUrl = mapCallbackUrlToWebUrl(url);
  if (targetUrl && typeof window !== "undefined") {
    window.location.replace(targetUrl);
  }
}

/** Install deep-link handlers when running in Tauri. */
export async function installTauriDeepLinkListener(): Promise<void> {
  if (!isDesktopShell() || typeof window === "undefined") {
    return;
  }

  try {
    const { getCurrent, onOpenUrl } =
      await import("@tauri-apps/plugin-deep-link");

    const current = await getCurrent();
    if (current?.length) {
      for (const url of current) {
        navigateToMappedCallback(url);
      }
    }

    await onOpenUrl((urls) => {
      for (const url of urls) {
        navigateToMappedCallback(url);
      }
    });
  } catch (error) {
    console.warn("[Tauri] Failed to install deep-link listener:", error);
  }
}
