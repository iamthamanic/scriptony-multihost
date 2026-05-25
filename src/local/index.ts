/**
 * Local Project Format — barrel export.
 *
 * T37: Public API for the .scriptony local project format.
 * SQLite read/write repositories are T38; this module defines the
 * schema, manifest, folder structure, and database initialization.
 *
 * Location: src/local/index.ts
 */

// Manifest types & validation
export {
  MANIFEST_FORMAT_VERSION,
  MANIFEST_FORMAT_ID,
  MANIFEST_FILENAME,
  createManifest,
  validateManifest,
  ManifestValidationError,
} from "./project-manifest";
export type {
  ProjectManifest,
  ProjectSyncMeta,
  StorageMode,
} from "./project-manifest";

// Schema DDL & version
export {
  SCHEMA_VERSION,
  SCHEMA_META_TABLE,
  TABLE,
  INITIAL_SCHEMA_DDL,
  SCHEMA_STATEMENTS,
  EXPECTED_TABLES,
  missingTables,
} from "./project-schema";
export type { TableName } from "./project-schema";

// Database init
export {
  createProjectDatabase,
  applySchemaToMemoryDatabase,
} from "./database-init";
export type { ProjectDatabaseSeed } from "./database-init";

// Folder structure & I/O
export {
  PROJECT_SUBDIRS,
  DATABASE_FILENAME,
  createProjectFolder,
  openProjectFolder,
  validateProjectFolder,
  resolveUniqueProjectDir,
  generateLocalProjectId,
  toFolderName,
  ProjectFolderError,
} from "./project-folder";
export type {
  ProjectFolderInfo,
  CreateProjectOptions,
  ValidateProjectFolderResult,
} from "./project-folder";
