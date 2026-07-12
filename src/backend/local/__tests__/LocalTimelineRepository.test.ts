import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { LocalDb } from "../LocalDb";
import { LocalTimelineRepository } from "../LocalTimelineRepository";
describe("LocalTimelineRepository", () => {
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

  it("creates a scene and lists it via getByProject", async () => {
    const repo = new LocalTimelineRepository(db);
    const created = (await repo.create(projectId, {
      type: "scene",
      label: "Scene 1",
      orderIndex: 0,
    })) as { id: string };

    const list = await repo.getByProject(projectId);
    expect(list).toHaveLength(1);
    expect((list[0] as { id: string }).id).toBe(created.id);
  });

  it("getByScene returns scene and child nodes", async () => {
    const repo = new LocalTimelineRepository(db);
    const scene = (await repo.create(projectId, {
      type: "scene",
      label: "Scene A",
      orderIndex: 0,
    })) as { id: string };

    await db.run(
      `INSERT INTO project_nodes (id, project_id, parent_id, node_type, label, order_index, metadata, created_at, updated_at)
       VALUES (?, ?, ?, 'shot', 'Shot 1', 0, '{}', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`,
      [`local_shot_1`, projectId, scene.id],
    );

    const byScene = await repo.getByScene(scene.id);
    expect(byScene.length).toBeGreaterThanOrEqual(2);
  });

  it("insertChange rejects invalid entityType", async () => {
    await expect(
      db.insertChange({
        projectId,
        entityType: "not_a_table",
        entityId: "x",
        operation: "create",
        payload: {},
      }),
    ).rejects.toThrow(/Invalid change_log entity_type/);
  });
});
