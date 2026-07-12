/**
 * Tests for SQLite schema initialization via sql.js.
 */

import { describe, expect, it } from "vitest";
import { applySchemaToMemoryDatabase } from "../database-init";
import { TABLE } from "../project-schema";

describe("database-init", () => {
  it("applies all schema statements to an in-memory database", async () => {
    const db = await applySchemaToMemoryDatabase();
    expect(() => {
      db.run(`SELECT COUNT(*) FROM ${TABLE.PROJECTS}`);
      db.run(`SELECT COUNT(*) FROM ${TABLE.WORLD_ITEMS}`);
      db.run(`SELECT COUNT(*) FROM ${TABLE.AUDIO_CLIPS}`);
      db.run(`SELECT COUNT(*) FROM ${TABLE.CHANGE_LOG}`);
    }).not.toThrow();
    db.close();
  });

  it("seeds the projects root row when seed is provided", async () => {
    const db = await applySchemaToMemoryDatabase({
      projectId: "local_test_1",
      title: "Test Film",
      description: "Demo",
      createdAt: "2026-05-24T12:00:00.000Z",
      updatedAt: "2026-05-24T12:00:00.000Z",
    });
    const rows = db.exec(
      `SELECT id, title FROM ${TABLE.PROJECTS} WHERE id = 'local_test_1'`,
    );
    expect(rows[0]?.values[0]).toEqual(["local_test_1", "Test Film"]);
    db.close();
  });
});
