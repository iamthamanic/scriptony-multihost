/**
 * Local Project Manifest — scriptony.json schema.
 *
 * T37: Defines the .scriptony project folder manifest.
 * Every local project folder contains a scriptony.json file
 * with project metadata, format version, and (later) sync state.
 *
 * Location: src/local/project-manifest.ts
 */

// ── Format constants ────────────────────────────────────────────────────────

/** Current manifest format version. Bump on breaking schema changes. */
export const MANIFEST_FORMAT_VERSION = 1;

/** Magic string identifying a Scriptony project manifest. */
export const MANIFEST_FORMAT_ID = "scriptony-project" as const;

/** File name of the manifest inside a .scriptony project folder. */
export const MANIFEST_FILENAME = "scriptony.json" as const;

/** Local storage mode in manifest. */
export type StorageMode = "local" | "cloud" | "hybrid";

// ── Manifest types ──────────────────────────────────────────────────────────

export type ProjectSyncStatus =
  | "disabled"
  | "pendingActivation"
  | "active"
  | "error";

export interface ProjectSyncMeta {
  /** Whether cloud sync is enabled for this project. */
  enabled: boolean;
  /** Activation lifecycle (T40). */
  syncStatus?: ProjectSyncStatus;
  /** Cloud provider identifier (set when sync is activated, T40). */
  provider?: string;
  /** Cloud-side project ID (set after first sync). */
  cloudProjectId?: string;
  /** ISO timestamp of last successful sync. */
  lastSyncedAt?: string;
  /** Last activation/sync error message. */
  lastError?: string;
}

export interface ProjectManifest {
  /** Format identifier — always "scriptony-project". */
  format: typeof MANIFEST_FORMAT_ID;
  /** Schema version — bump on breaking changes. */
  version: number;
  /** Unique local project ID (generated on creation). */
  projectId: string;
  /** Human-readable project title. */
  title: string;
  /** Optional project description. */
  description?: string;
  /** Storage mode: local (solo), cloud (synced), or hybrid. */
  storageMode: StorageMode;
  /** ISO timestamp of project creation. */
  createdAt: string;
  /** ISO timestamp of last manifest update. */
  updatedAt: string;
  /** Sync metadata — disabled by default for local projects. */
  sync: ProjectSyncMeta;
  projectType?: string;
}

// ── Validation ──────────────────────────────────────────────────────────────

function isIsoTimestamp(value: unknown): boolean {
  if (typeof value !== "string" || value.length === 0) return false;
  return !Number.isNaN(Date.parse(value));
}

/** Errors produced by validateManifest. */
export class ManifestValidationError extends Error {
  constructor(
    message: string,
    public readonly fields: string[],
  ) {
    super(message);
    this.name = "ManifestValidationError";
  }
}

/**
 * Validate a parsed manifest object against the schema.
 * Returns the manifest if valid; throws ManifestValidationError otherwise.
 */
export function validateManifest(raw: unknown): ProjectManifest {
  if (typeof raw !== "object" || raw === null) {
    throw new ManifestValidationError("Manifest must be a JSON object", [
      "root",
    ]);
  }

  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];

  if (obj.format !== MANIFEST_FORMAT_ID) {
    errors.push(
      `format must be "${MANIFEST_FORMAT_ID}", got "${obj.format ?? ""}"`,
    );
  }

  if (typeof obj.version !== "number" || obj.version < 1) {
    errors.push(`version must be a positive number, got ${obj.version}`);
  } else if (obj.version > MANIFEST_FORMAT_VERSION) {
    errors.push(
      `version ${obj.version} is newer than supported ${MANIFEST_FORMAT_VERSION}`,
    );
  }

  if (typeof obj.projectId !== "string" || obj.projectId.length === 0) {
    errors.push("projectId must be a non-empty string");
  }

  if (typeof obj.title !== "string" || obj.title.length === 0) {
    errors.push("title must be a non-empty string");
  }

  const validStorageModes: StorageMode[] = ["local", "cloud", "hybrid"];
  if (!validStorageModes.includes(obj.storageMode as StorageMode)) {
    errors.push(
      `storageMode must be one of ${validStorageModes.join(", ")}, got "${obj.storageMode ?? ""}"`,
    );
  }

  if (!isIsoTimestamp(obj.createdAt)) {
    errors.push("createdAt must be a parseable ISO date string");
  }

  if (!isIsoTimestamp(obj.updatedAt)) {
    errors.push("updatedAt must be a parseable ISO date string");
  }

  if (typeof obj.sync !== "object" || obj.sync === null) {
    errors.push("sync must be an object");
  } else {
    const sync = obj.sync as Record<string, unknown>;
    if (typeof sync.enabled !== "boolean") {
      errors.push("sync.enabled must be a boolean");
    }
  }

  if (errors.length > 0) {
    throw new ManifestValidationError(
      `Invalid project manifest: ${errors.join("; ")}`,
      errors,
    );
  }

  return raw as ProjectManifest;
}

// ── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create a new local project manifest with sensible defaults.
 * IDs are prefixed with "local_" to distinguish from cloud IDs.
 */
export function createManifest(options: {
  projectId: string;
  title: string;
  description?: string;
}): ProjectManifest {
  const now = new Date().toISOString();
  return {
    format: MANIFEST_FORMAT_ID,
    version: MANIFEST_FORMAT_VERSION,
    projectId: options.projectId,
    title: options.title,
    description: options.description,
    storageMode: "local",
    createdAt: now,
    updatedAt: now,
    sync: { enabled: false, syncStatus: "disabled" },
  };
}
