/**
 * Desktop workspace barrel export (T44).
 *
 * Location: src/local/workspace/index.ts
 */

export type { WorkspaceProjectEntry } from "./workspace-types";
export {
  WORKSPACE_STORE_FILE,
  WORKSPACE_ROOT_KEY,
  RECENT_PROJECT_PATHS_KEY,
  MAX_RECENT_PROJECTS,
} from "./workspace-types";

export {
  getWorkspaceRoot,
  clearWorkspaceRoot,
  restoreWorkspaceScope,
  getRecentProjectPaths,
  pushRecentProjectPath,
} from "./workspace-store";

export { pickWorkspaceFolder } from "./workspace-picker";

export {
  listWorkspaceProjects,
  createTauriWorkspaceFs,
} from "./workspace-scanner";
export type { WorkspaceDirEntry, WorkspaceFs } from "./workspace-scanner";
