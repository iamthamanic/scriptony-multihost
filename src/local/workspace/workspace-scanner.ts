/**
 * Scan workspace root for *.scriptony project folders (T44).
 *
 * Location: src/local/workspace/workspace-scanner.ts
 */

import { MANIFEST_FILENAME, validateManifest } from "../project-manifest";
import type { WorkspaceProjectEntry } from "./workspace-types";

const SCRIPTONY_SUFFIX = ".scriptony";

export interface WorkspaceDirEntry {
  name: string;
  isDirectory: boolean;
}

export interface WorkspaceFs {
  readDir(root: string): Promise<WorkspaceDirEntry[]>;
  readTextFile(path: string): Promise<string>;
}

function isScriptonyFolder(name: string): boolean {
  return name.endsWith(SCRIPTONY_SUFFIX);
}

/**
 * List valid .scriptony projects directly under workspace root.
 */
export async function listWorkspaceProjects(
  root: string,
  fs: WorkspaceFs,
): Promise<WorkspaceProjectEntry[]> {
  const { join } = await import("@tauri-apps/api/path");
  const normalizedRoot = root.replace(/[/\\]+$/, "");
  const entries = await fs.readDir(normalizedRoot);
  const projects: WorkspaceProjectEntry[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory || !isScriptonyFolder(entry.name)) continue;

    const dirPath = await join(normalizedRoot, entry.name);
    const manifestPath = await join(dirPath, MANIFEST_FILENAME);

    try {
      const raw = await fs.readTextFile(manifestPath);
      const manifest = validateManifest(JSON.parse(raw));
      projects.push({
        projectId: manifest.projectId,
        title: manifest.title,
        dirPath,
        updatedAt: manifest.updatedAt,
        projectType: manifest.projectType ?? "film",
      });
    } catch {
      // Skip corrupt or incomplete project folders.
    }
  }

  return projects.sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}

function dirEntryIsDirectory(entry: { isDirectory?: unknown }): boolean {
  const flag = entry.isDirectory;
  if (typeof flag === "function") {
    return Boolean((flag as () => boolean)());
  }
  return Boolean(flag);
}

/** Default FS implementation using Tauri plugin-fs. */
export async function createTauriWorkspaceFs(): Promise<WorkspaceFs> {
  const { readDir, readTextFile } = await import("@tauri-apps/plugin-fs");
  return {
    async readDir(root: string) {
      const entries = await readDir(root);
      return entries.map((e) => ({
        name: e.name ?? "",
        isDirectory: dirEntryIsDirectory(e),
      }));
    },
    readTextFile,
  };
}
