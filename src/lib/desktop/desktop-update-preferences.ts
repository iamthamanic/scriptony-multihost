/**
 * User preference: check for desktop app updates on startup.
 * Location: src/lib/desktop/desktop-update-preferences.ts
 */
import { STORAGE_KEYS } from "../config";

const ENABLED = "1";
const DISABLED = "0";

export function isDesktopUpdateOnStartupEnabled(): boolean {
  if (typeof localStorage === "undefined") return true;
  const raw = localStorage.getItem(STORAGE_KEYS.DESKTOP_UPDATE_ON_STARTUP);
  if (raw === DISABLED) return false;
  return true;
}

export function setDesktopUpdateOnStartupEnabled(enabled: boolean): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(
    STORAGE_KEYS.DESKTOP_UPDATE_ON_STARTUP,
    enabled ? ENABLED : DISABLED,
  );
}
