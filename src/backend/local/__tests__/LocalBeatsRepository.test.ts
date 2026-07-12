/**
 * LocalBeatsRepository tests (T62).
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { LocalDb } from "../LocalDb";
import { LocalBeatsRepository } from "../LocalBeatsRepository";
import { TABLE } from "@/local/project-schema";

describe("LocalBeatsRepository", () => {
  let db: LocalDb;
  let repo: LocalBeatsRepository;
  const projectId = "proj_test";

  beforeEach(async () => {
    db = await LocalDb.createInMemory();
    await db.run(
      `INSERT INTO ${TABLE.PROJECTS} (
        id, title, description, project_type, user_id, created_at, updated_at, sync_status
      ) VALUES (?, 'Test', '', 'film', 'local-user', ?, ?, 'local')`,
      [projectId, new Date().toISOString(), new Date().toISOString()],
    );
    repo = new LocalBeatsRepository(db);
  });

  afterEach(async () => {
    await db.close();
  });

  it("creates and lists beats ordered by order_index", async () => {
    await repo.create(projectId, {
      project_id: projectId,
      label: "Beat A",
      from_container_id: "act-1",
      to_container_id: "act-3",
      order_index: 1,
    });
    await repo.create(projectId, {
      project_id: projectId,
      label: "Beat B",
      from_container_id: "act-1",
      to_container_id: "act-3",
      order_index: 0,
    });

    const list = await repo.list(projectId);
    expect(list).toHaveLength(2);
    expect(list[0]?.label).toBe("Beat B");
    expect(list[1]?.label).toBe("Beat A");
  });

  it("updates and soft-deletes a beat", async () => {
    const created = await repo.create(projectId, {
      project_id: projectId,
      label: "Opening",
      from_container_id: "act-1",
      to_container_id: "act-3",
      pct_from: 0,
      pct_to: 10,
    });

    const updated = await repo.update(created.id, {
      label: "Opening Image",
      pct_to: 12,
    });
    expect(updated.label).toBe("Opening Image");
    expect(updated.pct_to).toBe(12);

    await repo.delete(created.id);
    expect(await repo.get(created.id)).toBeNull();
    expect(await repo.list(projectId)).toHaveLength(0);
  });
});
