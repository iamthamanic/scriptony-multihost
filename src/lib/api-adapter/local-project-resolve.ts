/**
 * Resolve local .scriptony folder paths by project ID (T59).
 *
 * Location: src/lib/api-adapter/local-project-resolve.ts
 */

import {
  createTauriWorkspaceFs,
  getWorkspaceRoot,
  listWorkspaceProjects,
  restoreWorkspaceScope,
} from "@/local/workspace";

export async function resolveDirPathByProjectId(
  projectId: string,
): Promise<string | null> {
  const root = await getWorkspaceRoot();
  if (!root) return null;
  await restoreWorkspaceScope();
  const fs = await createTauriWorkspaceFs();
  const entries = await listWorkspaceProjects(root, fs);
  const hit = entries.find((e) => e.projectId === projectId);
  return hit?.dirPath ?? null;
}

/** Deletes a project folder via validated Rust command (trusted workspace only). */
export async function removeLocalProjectByProjectId(
  projectId: string,
  confirmationPhrase: string,
): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("delete_workspace_project", {
    projectId,
    confirmationPhrase,
  });
}
