/**
 * Persist workspace root (Rust app data) and recent paths (plugin-store, T44).
 *
 * Location: src/local/workspace/workspace-store.ts
 */

import { invoke } from "@tauri-apps/api/core";
import { isDesktopShell } from "@/runtime/detect-runtime";
import {
  MAX_RECENT_PROJECTS,
  RECENT_PROJECT_PATHS_KEY,
  WORKSPACE_STORE_FILE,
} from "./workspace-types";

async function loadRecentStore() {
  if (!isDesktopShell()) {
    throw new Error("Workspace store requires the desktop app.");
  }
  const { load } = await import("@tauri-apps/plugin-store");
  return load(WORKSPACE_STORE_FILE, { defaults: {}, autoSave: true });
}

export async function getWorkspaceRoot(): Promise<string | null> {
  if (!isDesktopShell()) return null;
  const path = await invoke<string | null>("get_stored_workspace_root");
  return typeof path === "string" && path.trim().length > 0 ? path : null;
}

/** @internal Tests only — UI must use `pickWorkspaceFolder()` (trusted Rust picker). */
export async function setWorkspaceRoot(path: string): Promise<void> {
  await invoke("register_workspace_scope", { path: path.trim() });
}

export async function clearWorkspaceRoot(): Promise<void> {
  await invoke("clear_stored_workspace_root");
}

export async function restoreWorkspaceScope(): Promise<void> {
  await invoke("restore_workspace_scope");
}

export async function getRecentProjectPaths(): Promise<string[]> {
  if (!isDesktopShell()) return [];
  const store = await loadRecentStore();
  const value = await store.get<string[]>(RECENT_PROJECT_PATHS_KEY);
  if (!Array.isArray(value)) return [];
  return value.filter((p) => typeof p === "string" && p.length > 0);
}

export async function pushRecentProjectPath(dirPath: string): Promise<void> {
  const trimmed = dirPath.trim();
  if (!trimmed) return;
  const store = await loadRecentStore();
  const existing = await getRecentProjectPaths();
  const next = [trimmed, ...existing.filter((p) => p !== trimmed)].slice(
    0,
    MAX_RECENT_PROJECTS,
  );
  await store.set(RECENT_PROJECT_PATHS_KEY, next);
  await store.save();
}
