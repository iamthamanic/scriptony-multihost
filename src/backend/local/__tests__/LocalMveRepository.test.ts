/**
 * LocalMveRepository tests (in-memory SQLite + migration v4).
 * Location: src/backend/local/__tests__/LocalMveRepository.test.ts
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { LocalDb } from "../LocalDb";
import { LocalMveRepository } from "../LocalMveRepository";
import { migrateLocalDb } from "@/local/schema-migrations";
import { TABLE } from "@/local/project-schema";

describe("LocalMveRepository", () => {
  let db: LocalDb;
  let repo: LocalMveRepository;
  const projectId = "local_mve_proj";
  const sceneId = "scene_1";
  const clipId = "clip_dialog_1";

  beforeEach(async () => {
    db = await LocalDb.createInMemory();
    await migrateLocalDb(db);
    await db.run(
      `INSERT INTO projects (id, title, description, project_type, user_id, created_at, updated_at, sync_status)
       VALUES (?, 'MVE', '', 'film', 'local-user', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 'local')`,
      [projectId],
    );
    repo = new LocalMveRepository(db);
  });

  afterEach(async () => {
    await db.close();
  });

  it("creates a line bound to an audio clip and reads it back", async () => {
    const line = await repo.createLine(projectId, {
      sceneId,
      text: "Hallo Welt.",
      audioClipId: clipId,
      characterId: "char_hero",
    });

    expect(line.text).toBe("Hallo Welt.");
    expect(line.audioClipId).toBe(clipId);

    const byClip = await repo.getLineByAudioClipId(clipId);
    expect(byClip?.id).toBe(line.id);

    const listed = await repo.listLinesByScene(sceneId);
    expect(listed).toHaveLength(1);
  });

  it("updates line text and direction", async () => {
    const line = await repo.createLine(projectId, {
      sceneId,
      text: "Alt",
    });

    const updated = await repo.updateLine(line.id, {
      text: "Neu",
      direction: { emotion: "excited", pauseAfterMs: 200 },
      status: "dirty",
    });

    expect(updated.text).toBe("Neu");
    expect(updated.direction?.emotion).toBe("excited");
    expect(updated.status).toBe("dirty");
  });

  it("creates and lists voice profiles per character", async () => {
    const profile = await repo.createVoiceProfile(projectId, {
      name: "Heldin",
      characterId: "char_hero",
      engine: "elevenlabs",
      previewText: "Das ist meine Stimme.",
    });

    expect(profile.name).toBe("Heldin");
    expect(profile.workspaceId).toBe(projectId);

    const forChar = await repo.getVoiceProfileForCharacter(
      projectId,
      "char_hero",
    );
    expect(forChar?.id).toBe(profile.id);

    const all = await repo.listVoiceProfiles(projectId);
    expect(all).toHaveLength(1);
  });

  it("soft-deletes a line", async () => {
    const line = await repo.createLine(projectId, { sceneId, text: "X" });
    await repo.deleteLine(line.id);
    expect(await repo.getLine(line.id)).toBeNull();
  });

  it("writes change_log on create", async () => {
    const line = await repo.createLine(projectId, { sceneId, text: "Log" });
    const changes = await db.all(
      `SELECT * FROM change_log WHERE entity_type = ? AND entity_id = ?`,
      [TABLE.MVE_LINES, line.id],
    );
    expect(changes.length).toBeGreaterThanOrEqual(1);
  });
});
