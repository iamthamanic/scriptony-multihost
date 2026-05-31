/**
 * Desktop workspace types — project entries under a workspace root (T44).
 *
 * Location: src/local/workspace/workspace-types.ts
 */

export interface WorkspaceProjectEntry {
  projectId: string;
  title: string;
  dirPath: string;
  updatedAt: string;
  /** From manifest or database seed (defaults to film). */
  projectType?: string;
}

export const WORKSPACE_STORE_FILE = "scriptony-workspace.json";
export const WORKSPACE_ROOT_KEY = "workspace_root_path";
export const RECENT_PROJECT_PATHS_KEY = "recent_project_paths";
export const MAX_RECENT_PROJECTS = 10;
