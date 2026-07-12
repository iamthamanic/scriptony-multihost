/**
 * LocalProjectContext — opened .scriptony project (manifest + SQLite).
 *
 * T38: Single source for dirPath, manifest, and file-backed LocalDb.
 */

import {
  DATABASE_FILENAME,
  MANIFEST_FILENAME,
  createProjectFolder,
  openProjectFolder,
  type CreateProjectOptions,
  type ProjectFolderInfo,
  type ProjectManifest,
} from "@/local";
import { migrateLocalDb } from "@/local/schema-migrations";
import { LocalDb } from "./LocalDb";
import { isDesktopShell } from "@/runtime/detect-runtime";

export class LocalProjectContext {
  readonly dirPath: string;
  manifest: ProjectManifest;
  readonly db: LocalDb;

  private constructor(
    dirPath: string,
    manifest: ProjectManifest,
    db: LocalDb,
  ) {
    this.dirPath = dirPath;
    this.manifest = manifest;
    this.db = db;
  }

  get projectId(): string {
    return this.manifest.projectId;
  }

  get databasePath(): string {
    return `${this.dirPath}/${DATABASE_FILENAME}`;
  }

  static async open(dirPath: string): Promise<LocalProjectContext> {
    if (!isDesktopShell()) {
      throw new Error("Local projects require the desktop app.");
    }
    const info = await openProjectFolder(dirPath);
    const db = await LocalDb.openFromFile(`${info.dirPath}/${DATABASE_FILENAME}`);
    await migrateLocalDb(db);
    return new LocalProjectContext(info.dirPath, info.manifest, db);
  }

  static async create(
    options: CreateProjectOptions,
  ): Promise<LocalProjectContext> {
    const info = await createProjectFolder(options);
    const db = await LocalDb.openFromFile(`${info.dirPath}/${DATABASE_FILENAME}`);
    await migrateLocalDb(db);
    return new LocalProjectContext(info.dirPath, info.manifest, db);
  }

  /** Persist SQLite and scriptony.json after mutations. */
  async persist(): Promise<void> {
    this.manifest.updatedAt = new Date().toISOString();
    await this.db.persist();
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    await writeTextFile(
      `${this.dirPath}/${MANIFEST_FILENAME}`,
      JSON.stringify(this.manifest, null, 2),
    );
  }

  async close(): Promise<void> {
    await this.db.close();
  }

  toFolderInfo(): ProjectFolderInfo {
    return { dirPath: this.dirPath, manifest: this.manifest };
  }
}
