/**
 * Local project SQLite database initialization.
 *
 * T37: Creates database.sqlite and applies INITIAL_SCHEMA_DDL via sql.js.
 * Read/write repositories are implemented in T38.
 *
 * Location: src/local/database-init.ts
 */

import { isDesktopShell } from "../runtime/detect-runtime";
import { SCHEMA_STATEMENTS, TABLE } from "./project-schema";
import { ProjectFolderError } from "./project-folder";

export interface ProjectDatabaseSeed {
  projectId: string;
  title: string;
  description?: string;
  projectType?: string;
  createdAt: string;
  updatedAt: string;
}

type SqlJsInit = (typeof import("sql.js"))["default"];
type SqlJsStatic = Awaited<ReturnType<SqlJsInit>>;

async function loadSqlJs(initSqlJs: SqlJsInit): Promise<SqlJsStatic> {
  try {
    const wasmModule = await import("sql.js/dist/sql-wasm.wasm?url");
    const wasmUrl =
      typeof wasmModule.default === "string"
        ? wasmModule.default
        : String(wasmModule.default);
    return initSqlJs({ locateFile: () => wasmUrl });
  } catch {
    return initSqlJs();
  }
}

/**
 * Create an empty SQLite database file at dbPath and apply the initial schema.
 * Desktop shell only (uses sql.js + Tauri FS writeFile).
 */
function seedProjectsRow(
  db: import("sql.js").Database,
  seed: ProjectDatabaseSeed,
): void {
  db.run(
    `INSERT INTO ${TABLE.PROJECTS} (
      id, title, description, project_type, user_id, created_at, updated_at, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'local')`,
    [
      seed.projectId,
      seed.title,
      seed.description ?? "",
      seed.projectType ?? "film",
      "local-user",
      seed.createdAt,
      seed.updatedAt,
    ],
  );
}

export async function createProjectDatabase(
  dbPath: string,
  seed: ProjectDatabaseSeed,
): Promise<void> {
  if (!isDesktopShell()) {
    throw new ProjectFolderError(
      "Local database creation requires the desktop app.",
    );
  }

  try {
    const initSqlJs = (await import("sql.js")).default;
    const SQL = await loadSqlJs(initSqlJs);

    const db = new SQL.Database();
    db.run("PRAGMA foreign_keys = ON");
    for (const statement of SCHEMA_STATEMENTS) {
      db.run(statement);
    }
    seedProjectsRow(db, seed);

    const binary = db.export();
    db.close();

    const { writeFile } = await import("@tauri-apps/plugin-fs");
    await writeFile(dbPath, binary);
  } catch (err) {
    if (err instanceof ProjectFolderError) throw err;
    throw new ProjectFolderError(
      `SQLite schema initialization failed: ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  }
}

/**
 * Apply schema statements to an in-memory database (for tests).
 */
export async function applySchemaToMemoryDatabase(
  seed?: ProjectDatabaseSeed,
): Promise<{
  run: (sql: string, params?: import("sql.js").BindParams) => void;
  exec: (sql: string) => { values: unknown[][] }[];
  close: () => void;
}> {
  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run("PRAGMA foreign_keys = ON");
  for (const statement of SCHEMA_STATEMENTS) {
    db.run(statement);
  }
  if (seed) {
    seedProjectsRow(db, seed);
  }
  return {
    run: (sql: string, params?: import("sql.js").BindParams) =>
      db.run(sql, params),
    exec: (sql: string) => db.exec(sql),
    close: () => db.close(),
  };
}
