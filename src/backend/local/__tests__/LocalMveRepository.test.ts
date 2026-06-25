/**
 * LocalMveRepository tests (in-memory SQLite + migration v5).
 * Location: src/backend/local/__tests__/LocalMveRepository.test.ts
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { LocalDb } from "../LocalDb";
import { LocalMveRepository } from "../LocalMveRepository";
import { migrateLocalDb } from "@/local/schema-migrations";
import { TABLE } from "@/local/project-schema";
import { createMveLineRenderSnapshot } from "@/lib/multi-voice-engine/render/create-render-snapshot";

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

  it("creates a text-first line without an audio clip", async () => {
    const line = await repo.createLine(projectId, {
      sceneId,
      text: "Nur Text.",
      characterId: "char_hero",
    });

    expect(line.audioClipId).toBeUndefined();
    expect(line.text).toBe("Nur Text.");
    expect(await repo.getLineByAudioClipId(line.id)).toBeNull();
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

  it("selectTake persists selectedTakeId on line and is_selected on takes", async () => {
    const line = await repo.createLine(projectId, {
      sceneId,
      text: "Dialog.",
      characterId: "char_hero",
    });
    const voice = await repo.createVoiceProfile(projectId, {
      name: "Heldin",
      characterId: "char_hero",
      engine: "kokoro",
      baseVoiceId: "af_bella",
    });
    const job = await repo.createAudioJob(projectId, {
      lineId: line.id,
      engine: "dummy",
      takeCount: 2,
      scriptSnapshot: createMveLineRenderSnapshot(line, voice),
    });
    const takeA = await repo.createTake(projectId, {
      lineId: line.id,
      jobId: job.id,
      takeIndex: 0,
      status: "ready",
      audioUrl: "dummy://take-0",
    });
    const takeB = await repo.createTake(projectId, {
      lineId: line.id,
      jobId: job.id,
      takeIndex: 1,
      status: "ready",
      audioUrl: "/tmp/take-1.wav",
      isSelected: true,
    });
    await repo.selectTake(line.id, takeA.id);

    const takes = await repo.listTakesByLine(line.id);
    expect(takes.find((t) => t.id === takeA.id)?.isSelected).toBe(true);
    expect(takes.find((t) => t.id === takeB.id)?.isSelected).toBe(false);

    const updatedLine = await repo.getLine(line.id);
    expect(updatedLine?.selectedTakeId).toBe(takeA.id);
  });

  describe("lane links", () => {
    it("creates a lane link for a character and reads it back", async () => {
      const link = await repo.createLaneLink(projectId, {
        characterId: "char_hero",
        targetContainerId: sceneId,
        targetContainerType: "scene",
      });

      expect(link.characterId).toBe("char_hero");
      expect(link.targetContainerId).toBe(sceneId);
      expect(link.targetContainerType).toBe("scene");
      expect(link.enabled).toBe(true);

      const forChar = await repo.getLaneLinkForCharacter(
        projectId,
        "char_hero",
      );
      expect(forChar?.id).toBe(link.id);

      const all = await repo.listLaneLinks(projectId);
      expect(all).toHaveLength(1);
    });

    it("replaces an existing active link for a character", async () => {
      const first = await repo.createLaneLink(projectId, {
        characterId: "char_hero",
        targetContainerId: "scene_old",
        targetContainerType: "scene",
      });

      const second = await repo.createLaneLink(projectId, {
        characterId: "char_hero",
        targetContainerId: "scene_new",
        targetContainerType: "shot",
      });

      expect(second.targetContainerId).toBe("scene_new");
      expect(second.targetContainerType).toBe("shot");

      const active = await repo.getLaneLinkForCharacter(projectId, "char_hero");
      expect(active?.id).toBe(second.id);

      const all = await repo.listLaneLinks(projectId);
      expect(all).toHaveLength(1);

      const firstRow = await db.get(
        `SELECT deleted_at FROM ${TABLE.MVE_LANE_LINKS} WHERE id = ?`,
        [first.id],
      );
      expect(firstRow?.deleted_at).toBeTruthy();
    });

    it("updates link target and enabled state", async () => {
      const link = await repo.createLaneLink(projectId, {
        characterId: "char_hero",
        targetContainerId: sceneId,
      });

      const updated = await repo.updateLaneLink(link.id, {
        targetContainerId: "scene_2",
        enabled: false,
      });

      expect(updated.targetContainerId).toBe("scene_2");
      expect(updated.enabled).toBe(false);
    });

    it("soft-deletes a lane link", async () => {
      const link = await repo.createLaneLink(projectId, {
        characterId: "char_hero",
        targetContainerId: sceneId,
      });

      await repo.deleteLaneLink(link.id);
      expect(await repo.getLaneLink(link.id)).toBeNull();
      expect(
        await repo.getLaneLinkForCharacter(projectId, "char_hero"),
      ).toBeNull();
    });

    it("records change_log for lane link operations", async () => {
      const link = await repo.createLaneLink(projectId, {
        characterId: "char_hero",
        targetContainerId: sceneId,
      });

      const changes = await db.all(
        `SELECT * FROM change_log WHERE entity_type = ? AND entity_id = ?`,
        [TABLE.MVE_LANE_LINKS, link.id],
      );
      expect(changes.length).toBeGreaterThanOrEqual(1);
    });
  });
});
