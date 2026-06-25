/**
 * Tests for local SQLite schema migrations (T62).
 */

import { describe, expect, it } from "vitest";
import { LocalDb } from "@/backend/local/LocalDb";
import { TABLE, SCHEMA_VERSION } from "../project-schema";
import { migrateLocalDb } from "../schema-migrations";

describe("schema-migrations", () => {
  it("migrateLocalDb ensures story_beats exists on fresh in-memory DB", async () => {
    const db = await LocalDb.createInMemory();
    await migrateLocalDb(db);
    const row = await db.get(
      `SELECT value FROM schema_meta WHERE key = 'version'`,
    );
    expect(Number(row?.value)).toBe(SCHEMA_VERSION);

    const table = await db.get(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
      [TABLE.STORY_BEATS],
    );
    expect(table?.name).toBe(TABLE.STORY_BEATS);

    const mveLines = await db.get(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
      [TABLE.MVE_LINES],
    );
    expect(mveLines?.name).toBe(TABLE.MVE_LINES);
    await db.close();
  });

  it("migrateLocalDb handles fresh DB (already has schema)", async () => {
    const db = await LocalDb.createInMemory();
    await migrateLocalDb(db);

    const beatsTable = await db.get(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
      [TABLE.STORY_BEATS],
    );
    expect(beatsTable?.name).toBe(TABLE.STORY_BEATS);
    await db.close();
  });

  it("repairs v4 stamp when mve tables are missing", async () => {
    const db = await LocalDb.createInMemory();
    await db.run(`DROP TABLE IF EXISTS ${TABLE.MVE_LINES}`);
    await db.run(`DROP TABLE IF EXISTS ${TABLE.MVE_VOICE_PROFILES}`);
    await db.run(
      `INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', '4')`,
    );

    await migrateLocalDb(db);

    const mveLines = await db.get(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
      [TABLE.MVE_LINES],
    );
    const mveProfiles = await db.get(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
      [TABLE.MVE_VOICE_PROFILES],
    );
    expect(mveLines?.name).toBe(TABLE.MVE_LINES);
    expect(mveProfiles?.name).toBe(TABLE.MVE_VOICE_PROFILES);
    await db.close();
  });
});
