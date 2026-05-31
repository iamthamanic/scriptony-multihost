/**
 * Local Project Folder — creation, opening, and structure definition.
 *
 * T37: Defines the .scriptony project folder layout and provides
 * service functions for creating and validating project folders.
 * Actual file I/O is dispatched to Tauri FS APIs when running in
 * desktop mode; browser mode throws (local projects require desktop).
 *
 * Location: src/local/project-folder.ts
 */

import { createProjectDatabase } from "./database-init";
import {
  MANIFEST_FILENAME,
  MANIFEST_FORMAT_ID,
  MANIFEST_FORMAT_VERSION,
  type ProjectManifest,
  createManifest,
  validateManifest,
} from "./project-manifest";

import { isDesktopShell } from "../runtime/detect-runtime";

// ── Folder structure ─────────────────────────────────────────────────────────

/** Subdirectories inside a .scriptony project folder. */
export const PROJECT_SUBDIRS = [
  "assets/images",
  "assets/audio",
  "assets/video",
  "assets/documents",
  "exports",
  "cache",
] as const;

export type ProjectSubdir = (typeof PROJECT_SUBDIRS)[number];

/** SQLite database file name inside a .scriptony project folder. */
export const DATABASE_FILENAME = "database.sqlite" as const;

// ── Project folder result ────────────────────────────────────────────────────

export interface ProjectFolderInfo {
  /** Absolute path to the .scriptony directory. */
  dirPath: string;
  /** Parsed manifest (scriptony.json). */
  manifest: ProjectManifest;
}

export interface CreateProjectOptions {
  /** Absolute parent directory where the project folder will be created. */
  parentDir: string;
  /** Project title (used for folder name and manifest). */
  title: string;
  /** Optional description. */
  description?: string;
  /** Override project ID (default: auto-generated). */
  projectId?: string;
  projectType?: string;
}

export interface ValidateProjectFolderResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ── Errors ───────────────────────────────────────────────────────────────────

export class ProjectFolderError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ProjectFolderError";
  }
}

// ── ID generation ────────────────────────────────────────────────────────────

/** Generate a local project ID. Prefixed to distinguish from cloud IDs. */
export function generateLocalProjectId(): string {
  return `local_${crypto.randomUUID()}`;
}

// ── Folder name derivation ──────────────────────────────────────────────────

/**
 * Derive a safe folder name from a project title.
 * Sanitizes to filesystem-safe characters, appends .scriptony extension.
 */
export function toFolderName(title: string): string {
  const safe = title
    .trim()
    .toLowerCase()
    .replace(/[äöüß]/g, (m) => ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" })[m] ?? m)
    .replace(/[^a-z0-9_\-. ]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  const name = safe || "untitled";
  return `${name}.scriptony`;
}

// ── Manifest I/O (Tauri FS) ────────────────────────────────────────────────

async function writeManifest(
  dirPath: string,
  manifest: ProjectManifest,
): Promise<void> {
  const json = JSON.stringify(manifest, null, 2);
  const filePath = `${dirPath}/${MANIFEST_FILENAME}`;

  const { writeTextFile } = await import("@tauri-apps/plugin-fs");
  await writeTextFile(filePath, json);
}

async function readManifest(dirPath: string): Promise<ProjectManifest> {
  const filePath = `${dirPath}/${MANIFEST_FILENAME}`;

  const { readTextFile } = await import("@tauri-apps/plugin-fs");
  const raw = await readTextFile(filePath);
  return validateManifest(JSON.parse(raw));
}

/** Create the top-level `.scriptony` folder; fail if it already exists (race-safe). */
async function mkdirProjectRoot(dirPath: string): Promise<void> {
  const { mkdir, exists } = await import("@tauri-apps/plugin-fs");

  if (await exists(dirPath)) {
    throw new ProjectFolderError(
      `Project directory already exists: ${dirPath}. Open the existing project or retry.`,
    );
  }

  try {
    await mkdir(dirPath, { recursive: false });
  } catch (err) {
    if (await exists(dirPath)) {
      throw new ProjectFolderError(
        `Project directory already exists: ${dirPath}`,
        err,
      );
    }
    throw err;
  }
}

/** Create subdirectories inside an existing project folder. */
async function mkdirInsideProject(dirPath: string): Promise<void> {
  const { mkdir, exists } = await import("@tauri-apps/plugin-fs");

  if (await exists(dirPath)) return;
  await mkdir(dirPath, { recursive: true });
}

async function pathExists(path: string): Promise<boolean> {
  const { exists } = await import("@tauri-apps/plugin-fs");
  return exists(path);
}

function assertScriptonyProjectDir(dirPath: string): void {
  const normalized = dirPath.replace(/\/+$/, "");
  if (!normalized.endsWith(".scriptony")) {
    throw new ProjectFolderError(
      `Project path must be a .scriptony directory, got: ${dirPath}`,
    );
  }
}

/**
 * Resolve a unique project directory path under parentDir.
 * Does not overwrite an existing valid Scriptony project.
 */
export async function resolveUniqueProjectDir(
  parentDir: string,
  title: string,
): Promise<string> {
  const baseName = toFolderName(title).replace(/\.scriptony$/, "");
  const maxAttempts = 999;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const folderName =
      attempt === 0
        ? `${baseName}.scriptony`
        : `${baseName}_${attempt + 1}.scriptony`;
    const dirPath = `${parentDir}/${folderName}`;

    if (!(await pathExists(dirPath))) {
      return dirPath;
    }

    const manifestPath = `${dirPath}/${MANIFEST_FILENAME}`;
    if (await pathExists(manifestPath)) {
      try {
        await readManifest(dirPath);
        throw new ProjectFolderError(
          `Project already exists at ${dirPath}. Choose another title or open the existing project.`,
        );
      } catch (err) {
        if (err instanceof ProjectFolderError) throw err;
        // Corrupt or unreadable manifest — try next suffix.
      }
    }
  }

  throw new ProjectFolderError(
    `Could not find a unique project folder name for "${title}".`,
  );
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a new local project folder on disk.
 *
 * Creates the .scriptony directory with subdirectories, scriptony.json,
 * and database.sqlite with the initial schema applied.
 */
export async function createProjectFolder(
  options: CreateProjectOptions,
): Promise<ProjectFolderInfo> {
  if (!isDesktopShell()) {
    throw new ProjectFolderError(
      "Local projects require the desktop app. Switch to Tauri runtime to create projects.",
    );
  }

  const dirPath = await resolveUniqueProjectDir(
    options.parentDir,
    options.title,
  );
  const projectId = options.projectId ?? generateLocalProjectId();

  const manifest = createManifest({
    projectId,
    title: options.title,
    description: options.description,
  });

  try {
    await mkdirProjectRoot(dirPath);

    for (const sub of PROJECT_SUBDIRS) {
      await mkdirInsideProject(`${dirPath}/${sub}`);
    }

    await writeManifest(dirPath, manifest);

    const dbPath = `${dirPath}/${DATABASE_FILENAME}`;
    await createProjectDatabase(dbPath, {
      projectId: manifest.projectId,
      title: manifest.title,
      description: manifest.description,
      createdAt: manifest.createdAt,
      updatedAt: manifest.updatedAt,
    });

    return { dirPath, manifest };
  } catch (err) {
    if (err instanceof ProjectFolderError) throw err;
    throw new ProjectFolderError(
      `Failed to create project folder at ${dirPath}: ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  }
}

/**
 * Open an existing .scriptony project folder.
 */
export async function openProjectFolder(
  dirPath: string,
): Promise<ProjectFolderInfo> {
  if (!isDesktopShell()) {
    throw new ProjectFolderError(
      "Local projects require the desktop app. Switch to Tauri runtime to open projects.",
    );
  }

  assertScriptonyProjectDir(dirPath);

  try {
    const manifest = await readManifest(dirPath);

    const dbPath = `${dirPath}/${DATABASE_FILENAME}`;
    if (!(await pathExists(dbPath))) {
      throw new ProjectFolderError(
        `Missing ${DATABASE_FILENAME} at ${dirPath}. The project may be incomplete.`,
      );
    }

    for (const sub of PROJECT_SUBDIRS) {
      const subPath = `${dirPath}/${sub}`;
      if (!(await pathExists(subPath))) {
        await mkdirInsideProject(subPath);
      }
    }

    return { dirPath, manifest };
  } catch (err) {
    if (err instanceof ProjectFolderError) throw err;
    throw new ProjectFolderError(
      `Failed to open project at ${dirPath}: ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  }
}

/**
 * Validate a project folder has the expected structure.
 */
export async function validateProjectFolder(
  dirPath: string,
): Promise<ValidateProjectFolderResult> {
  if (!isDesktopShell()) {
    return {
      valid: false,
      errors: ["Local projects require the desktop app"],
      warnings: [],
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    assertScriptonyProjectDir(dirPath);

    const manifestPath = `${dirPath}/${MANIFEST_FILENAME}`;
    if (!(await pathExists(manifestPath))) {
      return {
        valid: false,
        errors: [`Missing ${MANIFEST_FILENAME}`],
        warnings: [],
      };
    }

    const manifest = await readManifest(dirPath);
    if (manifest.format !== MANIFEST_FORMAT_ID) {
      errors.push(`Invalid format identifier: ${manifest.format}`);
    }
    if (manifest.version > MANIFEST_FORMAT_VERSION) {
      errors.push(
        `Manifest version ${manifest.version} is newer than supported ${MANIFEST_FORMAT_VERSION}`,
      );
    }

    const dbPath = `${dirPath}/${DATABASE_FILENAME}`;
    if (!(await pathExists(dbPath))) {
      errors.push(`Missing ${DATABASE_FILENAME}`);
    }

    for (const sub of PROJECT_SUBDIRS) {
      if (!(await pathExists(`${dirPath}/${sub}`))) {
        warnings.push(`Missing subdirectory: ${sub}`);
      }
    }
  } catch (err) {
    errors.push(
      `Validation error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}
