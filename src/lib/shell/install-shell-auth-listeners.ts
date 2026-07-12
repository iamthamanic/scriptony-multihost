/**
 * Registers auth callback listeners for native shells (Capacitor + Tauri).
 *
 * Location: src/lib/shell/install-shell-auth-listeners.ts
 */

import {
  hydrateNativeSessionStorage,
  installCapacitorUrlListener,
} from "../capacitor/platform";
import { installTauriDeepLinkListener } from "../desktop/tauri-deep-link";
import { promptAppUpdateOnStartup } from "../desktop/prompt-app-update";

/** Hydrate session storage and install URL/deep-link listeners. */
export async function installShellAuthListeners(): Promise<void> {
  try {
    await hydrateNativeSessionStorage();
    await installCapacitorUrlListener();
    await installTauriDeepLinkListener();
    void promptAppUpdateOnStartup();
  } catch (error) {
    console.warn("[Shell] Auth listener setup failed:", error);
  }
}
