/**
 * Startup update prompt for the Tauri desktop shell.
 * Location: src/lib/desktop/prompt-app-update.ts
 */
import {
  closeAvailableUpdate,
  fetchAvailableUpdate,
  installAvailableUpdate,
  isAppUpdaterAvailable,
  restartDesktopApp,
} from "./app-updater";
import { isDesktopUpdateOnStartupEnabled } from "./desktop-update-preferences";

export async function promptAppUpdateOnStartup(): Promise<void> {
  if (!isAppUpdaterAvailable()) return;
  if (!isDesktopUpdateOnStartupEnabled()) return;

  try {
    const result = await fetchAvailableUpdate();
    if (!result) return;

    const { ask } = await import("@tauri-apps/plugin-dialog");
    const installNow = await ask(
      `Version ${result.info.version} ist verfügbar (installiert: ${result.info.currentVersion}). Jetzt herunterladen und installieren?`,
      {
        title: "Scriptony Update",
        kind: "info",
        okLabel: "Jetzt aktualisieren",
        cancelLabel: "Später",
      },
    );

    if (!installNow) {
      await closeAvailableUpdate(result.update);
      return;
    }

    await installAvailableUpdate(result.update);

    const restartNow = await ask(
      "Das Update wurde installiert. Scriptony jetzt neu starten?",
      {
        title: "Neustart erforderlich",
        kind: "info",
        okLabel: "Neu starten",
        cancelLabel: "Später",
      },
    );

    if (restartNow) {
      await restartDesktopApp();
    }
  } catch (error) {
    console.warn("[Updater] Startup check failed:", error);
  }
}
