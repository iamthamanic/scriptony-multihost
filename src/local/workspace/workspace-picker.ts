/**
 * Native folder picker for workspace root (T44, Rust dialog + scope).
 *
 * Location: src/local/workspace/workspace-picker.ts
 */

import { invoke } from "@tauri-apps/api/core";
import { isDesktopShell } from "@/runtime/detect-runtime";

export async function pickWorkspaceFolder(): Promise<string | null> {
  if (!isDesktopShell()) {
    throw new Error("Workspace picker requires the desktop app.");
  }

  try {
    const path = await invoke<string>("pick_workspace_folder");
    return path?.trim() ? path : null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("cancelled")) {
      return null;
    }
    throw err;
  }
}
