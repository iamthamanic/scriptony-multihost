/**
 * LocalProjectRepository tests (in-memory SQLite).
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { LocalDb } from "../LocalDb";
import { LocalProjectRepository } from "../LocalProjectRepository";
import { TABLE } from "@/local/project-schema";

describe("LocalProjectRepository", () => {
  let db: LocalDb;

  beforeEach(async () => {
    db = await LocalDb.createInMemory();
    await db.run(
      `INSERT INTO projects (id, title, description, project_type, user_id, created_at, updated_at, sync_status)
       VALUES ('local_seed', 'Seed', '', 'film', 'local-user', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 'local')`,
    );
  });

  afterEach(async () => {
    await db.close();
  });

  it("lists non-deleted projects", async () => {
    const repo = new LocalProjectRepository(db);
    const list = await repo.list();
    expect(list.some((p) => p.$id === "local_seed")).toBe(true);
  });

  it("rejects repository-level create", async () => {
    const repo = new LocalProjectRepository(db);
    await expect(repo.create({ name: "New Film" })).rejects.toThrow(
      /createProjectFolder/,
    );
  });

  it("updates project and writes change_log", async () => {
    const repo = new LocalProjectRepository(db);
    const updated = await repo.update("local_seed", { name: "Renamed" });
    expect(updated.name).toBe("Renamed");

    const changes = await db.all(
      `SELECT * FROM ${TABLE.CHANGE_LOG} WHERE entity_id = ?`,
      ["local_seed"],
    );
    expect(changes.length).toBeGreaterThan(0);
  });

  it("soft-deletes project", async () => {
    const repo = new LocalProjectRepository(db);
    await repo.delete("local_seed");
    const found = await repo.get("local_seed");
    expect(found).toBeNull();
  });
});
