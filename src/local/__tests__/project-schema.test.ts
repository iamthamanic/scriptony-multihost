/**
 * Tests for local SQLite schema DDL.
 *
 * T37: Ensures all core tables are present in INITIAL_SCHEMA_DDL and SCHEMA_STATEMENTS.
 */

import { describe, expect, it } from "vitest";
import {
  INITIAL_SCHEMA_DDL,
  SCHEMA_STATEMENTS,
  TABLE,
  missingTables,
} from "../project-schema";

describe("project-schema", () => {
  it("INITIAL_SCHEMA_DDL includes all expected tables", () => {
    expect(missingTables(INITIAL_SCHEMA_DDL).size).toBe(0);
  });

  it("references world_items not a typo key", () => {
    expect(INITIAL_SCHEMA_DDL).toContain(
      `CREATE TABLE IF NOT EXISTS ${TABLE.WORLD_ITEMS}`,
    );
    expect(INITIAL_SCHEMA_DDL).not.toContain("undefined");
  });

  it("SCHEMA_STATEMENTS includes world_items table", () => {
    const joined = SCHEMA_STATEMENTS.join("\n");
    expect(joined).toContain(`CREATE TABLE IF NOT EXISTS ${TABLE.WORLD_ITEMS}`);
    expect(missingTables(joined).size).toBe(0);
  });

  it("SCHEMA_STATEMENTS has no empty entries", () => {
    for (const stmt of SCHEMA_STATEMENTS) {
      expect(stmt.trim().length).toBeGreaterThan(0);
    }
  });

  it("INITIAL_SCHEMA_DDL stays in sync with SCHEMA_STATEMENTS", () => {
    const expected = SCHEMA_STATEMENTS.map((s) => `${s};`).join("\n\n");
    expect(INITIAL_SCHEMA_DDL).toBe(expected);
    expect(missingTables(INITIAL_SCHEMA_DDL).size).toBe(0);
  });
});
