/**
 * Tests for Multi-Voice-Engine Zod schemas (issue #3).
 * Location: src/lib/multi-voice-engine/__tests__/schema.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  MveCharacterSchema,
  MveLineSchema,
  MveSceneSchema,
  MveVoiceProfileSchema,
  parseMveLine,
} from "../schema";

const NOW = "2026-06-24T10:00:00.000Z";

describe("MveSceneSchema", () => {
  it("accepts a minimal scene", () => {
    const result = MveSceneSchema.safeParse({
      id: "mve_scene_550e8400-e29b-41d4-a716-446655440000",
      projectId: "proj_local_1",
      orderIndex: 0,
      title: "Szene 1",
      status: "draft",
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(result.success).toBe(true);
  });
});

describe("MveLineSchema", () => {
  it("accepts dialogue with character and audioClipId", () => {
    const result = MveLineSchema.safeParse({
      id: "mve_line_1",
      sceneId: "mve_scene_1",
      orderIndex: 0,
      type: "dialogue",
      characterId: "char_1",
      text: "MARA: Hast du das auch gehört?",
      audioClipId: "clip_abc",
      status: "draft",
      direction: { emotion: "tense", pace: "medium" },
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(result.success).toBe(true);
  });

  it("allows draft line without characterId", () => {
    const result = MveLineSchema.safeParse({
      id: "mve_line_2",
      sceneId: "mve_scene_1",
      orderIndex: 1,
      type: "dialogue",
      status: "draft",
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(result.success).toBe(true);
  });

  it("parseMveLine returns DE-friendly messages on invalid emotion", () => {
    const result = parseMveLine({
      id: "mve_line_3",
      sceneId: "mve_scene_1",
      orderIndex: 0,
      direction: { emotion: "not_an_emotion" },
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.messages.length).toBeGreaterThan(0);
    }
  });
});

describe("MveCharacterSchema", () => {
  it("accepts narrator with voiceId", () => {
    const result = MveCharacterSchema.safeParse({
      id: "char_narrator",
      projectId: "proj_1",
      name: "Erzähler",
      roleType: "narrator",
      voiceId: "voice_1",
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(result.success).toBe(true);
  });
});

describe("MveVoiceProfileSchema", () => {
  it("accepts kokoro default voice with preview text", () => {
    const result = MveVoiceProfileSchema.safeParse({
      id: "voice_1",
      userId: "local-user",
      name: "Anna",
      language: "de",
      engine: "kokoro",
      type: "default",
      status: "ready",
      previewText: "Dies ist ein Standard-Satz für die Stimmvorschau.",
      consentStatus: "not_required",
      commercialUseAllowed: false,
      version: 1,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(result.success).toBe(true);
  });
});
