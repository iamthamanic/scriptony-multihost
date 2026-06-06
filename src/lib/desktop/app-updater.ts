/**
 * Tauri in-app updater — desktop shell only.
 * Wraps `@tauri-apps/plugin-updater` so UI/hooks stay testable on web builds.
 *
 * Location: src/lib/desktop/app-updater.ts
 */
import { isDesktopShell } from "../../runtime/detect-runtime";

export type AppUpdaterPhase =
  | "idle"
  | "checking"
  | "available"
  | "up-to-date"
  | "downloading"
  | "installing"
  | "ready"
  | "error";

export interface AppUpdateInfo {
  currentVersion: string;
  version: string;
  notes?: string;
}

export function isAppUpdaterAvailable(): boolean {
  return isDesktopShell();
}

export async function readInstalledAppVersion(): Promise<string | null> {
  if (!isAppUpdaterAvailable()) return null;
  try {
    const { getVersion } = await import("@tauri-apps/api/app");
    return getVersion();
  } catch {
    return null;
  }
}

export async function fetchAvailableUpdate(): Promise<{
  info: AppUpdateInfo;
  update: import("@tauri-apps/plugin-updater").Update;
} | null> {
  if (!isAppUpdaterAvailable()) return null;
  const { check } = await import("@tauri-apps/plugin-updater");
  const update = await check();
  if (!update) return null;
  return {
    info: {
      currentVersion: update.currentVersion,
      version: update.version,
      notes: update.body,
    },
    update,
  };
}

export async function installAvailableUpdate(
  update: import("@tauri-apps/plugin-updater").Update,
  onEvent?: (event: import("@tauri-apps/plugin-updater").DownloadEvent) => void,
): Promise<void> {
  await update.downloadAndInstall(onEvent);
}

export async function closeAvailableUpdate(
  update: import("@tauri-apps/plugin-updater").Update,
): Promise<void> {
  await update.close();
}

export async function restartDesktopApp(): Promise<void> {
  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
}
