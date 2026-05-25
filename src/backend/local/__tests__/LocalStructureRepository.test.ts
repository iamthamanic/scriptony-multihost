import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { LocalDb } from "../LocalDb";
import { LocalStructureRepository } from "../LocalStructureRepository";

describe("LocalStructureRepository", () => {
  let db: LocalDb;
  const projectId = "local_test_proj";

  beforeEach(async () => {
    db = await LocalDb.createInMemory();
    await db.run(
      `INSERT INTO projects (id, title, description, project_type, user_id, created_at, updated_at, sync_status)
       VALUES (?, 'T', '', 'film', 'local-user', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 'local')`,
      [projectId],
    );
  });

  afterEach(async () => {
    await db.close();
  });

  it("creates and lists nodes", async () => {
    const repo = new LocalStructureRepository(db);
    const node = await repo.create({
      projectId,
      parentId: null,
      type: "act",
      label: "Act 1",
      orderIndex: 0,
    });
    const list = await repo.getByProject(projectId);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(node.id);
  });
});
