/**
 * Local jobs sidecar lifecycle (T43) — desktop only.
 */

import { invoke } from "@tauri-apps/api/core";
import { isDesktopShell } from "@/runtime/detect-runtime";
import { toast } from "sonner";

const SIDECAR_TOKEN_KEY = "scriptony_sidecar_token";

export function getSidecarAuthToken(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(SIDECAR_TOKEN_KEY);
}

export async function startSidecar(projectDir: string): Promise<void> {
  if (!isDesktopShell()) return;
  try {
    const token = await invoke<string>("spawn_sidecar", { projectDir });
    if (token && typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(SIDECAR_TOKEN_KEY, token);
    }
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : "Local sidecar konnte nicht gestartet werden",
    );
    throw error;
  }
}

export async function stopSidecar(): Promise<void> {
  if (!isDesktopShell()) return;
  try {
    await invoke("stop_sidecar");
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(SIDECAR_TOKEN_KEY);
    }
  } catch {
    /* ignore */
  }
}

export async function sidecarHealth(): Promise<boolean> {
  if (!isDesktopShell()) return false;
  try {
    return await invoke<boolean>("sidecar_health");
  } catch {
    return false;
  }
}
