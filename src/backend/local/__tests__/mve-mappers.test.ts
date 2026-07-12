/**
 * MVE mapper round-trip tests.
 * Location: src/backend/local/__tests__/mve-mappers.test.ts
 */

import { describe, expect, it } from "vitest";
import { mapMveLineRow, mapMveVoiceProfileRow } from "../mve-mappers";

describe("mve-mappers", () => {
  it("maps line row with direction JSON", () => {
    const line = mapMveLineRow({
      id: "mve_line_1",
      scene_id: "scene_a",
      order_index: 2,
      line_type: "dialogue",
      character_id: "char_1",
      text: "Test",
      direction_json: JSON.stringify({ emotion: "neutral", pace: "medium" }),
      status: "draft",
      audio_clip_id: "clip_9",
      created_at: "2026-06-24T10:00:00.000Z",
      updated_at: "2026-06-24T10:00:00.000Z",
    });

    expect(line.id).toBe("mve_line_1");
    expect(line.direction?.emotion).toBe("neutral");
    expect(line.audioClipId).toBe("clip_9");
  });

  it("maps voice profile row", () => {
    const profile = mapMveVoiceProfileRow({
      id: "mve_voice_1",
      project_id: "proj_1",
      user_id: "local-user",
      name: "Narrator",
      language: "de",
      engine: "elevenlabs",
      profile_type: "default",
      status: "ready",
      consent_status: "not_required",
      commercial_use_allowed: 0,
      character_id: "char_abc",
      base_voice_id: "af_bella",
      version: 1,
      created_at: "2026-06-24T10:00:00.000Z",
      updated_at: "2026-06-24T10:00:00.000Z",
    });

    expect(profile.name).toBe("Narrator");
    expect(profile.workspaceId).toBe("proj_1");
    expect(profile.characterId).toBe("char_abc");
    expect(profile.baseVoiceId).toBe("af_bella");
    expect(profile.commercialUseAllowed).toBe(false);
  });
});
