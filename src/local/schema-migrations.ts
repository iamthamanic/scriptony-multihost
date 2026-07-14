/**
 * Local SQLite schema migrations (T62).
 *
 * Location: src/local/schema-migrations.ts
 */

import type { BindParams } from "sql.js";
import type { LocalDb } from "@/backend/local/LocalDb";
import {
  SCHEMA_META_TABLE,
  SCHEMA_VERSION,
  TABLE,
  MVE_SCHEMA_STATEMENTS,
  MVE_RENDER_SCHEMA_STATEMENTS,
  MVE_VOICE_STUDIO_SCHEMA_STATEMENTS,
  MIGRATION_V7_STATEMENTS,
  MIGRATION_V8_STATEMENTS,
} from "./project-schema";

/** Idempotent DDL for schema v2 (story_beats). */
export const MIGRATION_V2_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS ${TABLE.STORY_BEATS} (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  label TEXT NOT NULL,
  template_abbr TEXT,
  description TEXT,
  from_container_id TEXT NOT NULL,
  to_container_id TEXT NOT NULL,
  pct_from REAL NOT NULL DEFAULT 0,
  pct_to REAL NOT NULL DEFAULT 0,
  color TEXT,
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (project_id) REFERENCES ${TABLE.PROJECTS}(id) ON DELETE CASCADE
)`,
  `CREATE INDEX IF NOT EXISTS idx_story_beats_project ON ${TABLE.STORY_BEATS}(project_id)`,
];

async function readSchemaVersion(db: LocalDb): Promise<number> {
  const row = await db.get(
    `SELECT value FROM ${SCHEMA_META_TABLE} WHERE key = 'version'`,
  );
  if (!row?.value) return 1;
  const parsed = Number.parseInt(String(row.value), 10);
  return Number.isFinite(parsed) ? parsed : 1;
}

async function setSchemaVersion(db: LocalDb, version: number): Promise<void> {
  await db.run(
    `INSERT INTO ${SCHEMA_META_TABLE} (key, value) VALUES ('version', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [String(version)],
  );
}

/** Idempotent lane index remap for schema v3 (lane ranges v2). */
export const MIGRATION_V3_LANE_REMAP: readonly {
  sql: string;
  params?: BindParams;
}[] = [
  {
    sql: `UPDATE audio_clips SET lane_index = lane_index + 90 WHERE lane_index >= 10 AND lane_index <= 39 AND deleted_at IS NULL`,
  },
  {
    sql: `UPDATE audio_clips SET lane_index = lane_index + 100 WHERE lane_index >= 90 AND lane_index <= 99 AND deleted_at IS NULL`,
  },
];

/** Idempotent DDL for schema v4 (multi-voice-engine). */
export const MIGRATION_V4_STATEMENTS = MVE_SCHEMA_STATEMENTS;

/** Idempotent DDL for schema v5 (MVE render). */
export const MIGRATION_V5_STATEMENTS = MVE_RENDER_SCHEMA_STATEMENTS;

/** Idempotent DDL for schema v6 (MVE voice studio). */
export const MIGRATION_V6_STATEMENTS = MVE_VOICE_STUDIO_SCHEMA_STATEMENTS;

async function tableExists(db: LocalDb, tableName: string): Promise<boolean> {
  const row = await db.get(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    [tableName],
  );
  return row?.name === tableName;
}

/**
 * Repair DBs that were stamped schema v4 before MVE DDL shipped.
 * Safe to run on every open — statements are CREATE IF NOT EXISTS.
 */
export async function ensureMveTables(db: LocalDb): Promise<void> {
  const hasLines = await tableExists(db, TABLE.MVE_LINES);
  const hasProfiles = await tableExists(db, TABLE.MVE_VOICE_PROFILES);
  if (hasLines && hasProfiles) return;

  for (const stmt of MIGRATION_V4_STATEMENTS) {
    await db.run(stmt);
  }
}

export async function ensureMveRenderTables(db: LocalDb): Promise<void> {
  const hasJobs = await tableExists(db, TABLE.MVE_AUDIO_JOBS);
  const hasTakes = await tableExists(db, TABLE.MVE_TAKES);
  if (hasJobs && hasTakes) return;

  for (const stmt of MIGRATION_V5_STATEMENTS) {
    await db.run(stmt);
  }
}

export async function ensureMveVoiceStudioTables(db: LocalDb): Promise<void> {
  const hasConsents = await tableExists(db, TABLE.MVE_VOICE_CONSENTS);
  const hasRequests = await tableExists(db, TABLE.MVE_VOICE_REQUESTS);
  if (hasConsents && hasRequests) return;

  for (const stmt of MIGRATION_V6_STATEMENTS) {
    await db.run(stmt);
  }
}

async function columnExists(
  db: LocalDb,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const columns = await db.all(`PRAGMA table_info(${tableName})`);
  return columns.some((c) => String(c.name) === columnName);
}

/** Repair DBs stamped v7 before design_spec_json existed on fresh CREATE TABLE. */
export async function ensureMveVoiceProfileDesignSpecColumn(
  db: LocalDb,
): Promise<void> {
  const hasProfiles = await tableExists(db, TABLE.MVE_VOICE_PROFILES);
  if (!hasProfiles) return;
  if (await columnExists(db, TABLE.MVE_VOICE_PROFILES, "design_spec_json")) {
    return;
  }
  for (const stmt of MIGRATION_V7_STATEMENTS) {
    await db.run(stmt);
  }
}

/** Repair DBs stamped v8 before identity columns existed on fresh CREATE TABLE. */
export async function ensureMveVoiceProfileIdentityColumns(
  db: LocalDb,
): Promise<void> {
  const hasProfiles = await tableExists(db, TABLE.MVE_VOICE_PROFILES);
  if (!hasProfiles) return;
  if (await columnExists(db, TABLE.MVE_VOICE_PROFILES, "creation_mode")) {
    return;
  }
  for (const stmt of MIGRATION_V8_STATEMENTS) {
    await db.run(stmt);
  }
}

/** Apply pending migrations up to SCHEMA_VERSION. */
export async function migrateLocalDb(db: LocalDb): Promise<void> {
  let version = await readSchemaVersion(db);

  if (version < 2) {
    for (const stmt of MIGRATION_V2_STATEMENTS) {
      await db.run(stmt);
    }
    version = 2;
    await setSchemaVersion(db, version);
  }

  if (version < 3) {
    const clipsTable = await db.get(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'audio_clips'`,
    );
    if (clipsTable?.name) {
      for (const { sql, params } of MIGRATION_V3_LANE_REMAP) {
        await db.run(sql, params);
      }
    }
    version = 3;
    await setSchemaVersion(db, version);
  }

  if (version < 4) {
    for (const stmt of MIGRATION_V4_STATEMENTS) {
      await db.run(stmt);
    }
    version = 4;
    await setSchemaVersion(db, version);
  }

  await ensureMveTables(db);

  if (version < 5) {
    for (const stmt of MIGRATION_V5_STATEMENTS) {
      await db.run(stmt);
    }
    version = 5;
    await setSchemaVersion(db, version);
  }

  await ensureMveRenderTables(db);

  if (version < 6) {
    for (const stmt of MIGRATION_V6_STATEMENTS) {
      await db.run(stmt);
    }
    version = 6;
    await setSchemaVersion(db, version);
  }

  await ensureMveVoiceStudioTables(db);
  await ensureMveVoiceProfileDesignSpecColumn(db);

  if (version < 7) {
    version = 7;
    await setSchemaVersion(db, version);
  }

  await ensureMveVoiceProfileIdentityColumns(db);

  if (version < 8) {
    version = 8;
    await setSchemaVersion(db, version);
  }

  if (version < SCHEMA_VERSION) {
    await setSchemaVersion(db, SCHEMA_VERSION);
  }
}
