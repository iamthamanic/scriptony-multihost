/**
 * LocalStyleProfileRepository tests (in-memory SQLite).
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { LocalDb } from "../LocalDb";
import { LocalStyleProfileRepository } from "../LocalStyleProfileRepository";
import { TABLE } from "@/local/project-schema";

describe("LocalStyleProfileRepository", () => {
  let db: LocalDb;
  let repo: LocalStyleProfileRepository;
  const projectId = "local_style_proj";

  beforeEach(async () => {
    db = await LocalDb.createInMemory();
    await db.run(
      "INSERT INTO projects (id, title, description, project_type, user_id, created_at, updated_at, sync_status) VALUES (?, 'T', '', 'film', 'local-user', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 'local')",
      [projectId],
    );
    repo = new LocalStyleProfileRepository(db);
  });

  afterEach(async () => {
    await db.close();
  });

  it("creates from animated template", async () => {
    const profile = await repo.create(projectId, {
      name: "Cutout Satire",
      templateId: "animated_stylized",
    });
    expect(profile.name).toBe("Cutout Satire");
    expect(profile.type).toBe("animated_stylized");
    expect(profile.spec.visualSpec.styleDna.status).toBe("configured");
  });

  it("lists and updates profiles", async () => {
    const p = await repo.create(projectId, {
      name: "One",
      templateId: "animated_stylized",
    });
    const list = await repo.list(projectId);
    expect(list).toHaveLength(1);

    const updated = await repo.update(p.id, { name: "One Updated" });
    expect(updated.name).toBe("One Updated");
  });

  it("soft-deletes a profile", async () => {
    const p = await repo.create(projectId, { name: "Del", templateId: "animated_stylized" });
    await repo.delete(p.id);
    expect(await repo.get(p.id)).toBeNull();
  });

  it("writes change_log on create", async () => {
    const p = await repo.create(projectId, { name: "Log", templateId: "animated_stylized" });
    const changes = await db.all(
      "SELECT * FROM change_log WHERE entity_type = ? AND entity_id = ?",
      [TABLE.STYLE_PROFILES, p.id],
    );
    expect(changes.length).toBeGreaterThanOrEqual(1);
  });

  it("patches sync metadata", async () => {
    const p = await repo.create(projectId, {
      name: "Sync",
      templateId: "animated_stylized",
    });
    await repo.patchSyncMeta(p.id, {
      status: "synced",
      cloudId: "cloud-abc",
      lastSyncedAt: "2026-06-15T12:00:00.000Z",
    });
    const row = await repo.get(p.id);
    expect(row?.sync.status).toBe("synced");
    expect(row?.sync.cloudId).toBe("cloud-abc");
    expect(row?.sync.lastSyncedAt).toBe("2026-06-15T12:00:00.000Z");
  });
});
