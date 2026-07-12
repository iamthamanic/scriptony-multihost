/**
 * Tests for MVE render schema (AudioJob, Take, RenderLine).
 * Location: src/lib/multi-voice-engine/__tests__/render-schema.test.ts
 */

import { describe, expect, it } from "vitest";
import { MveAudioJobSchema } from "../schema/audio-job";
import { MveTakeSchema } from "../schema/take";
import { RenderLineInputSchema } from "../schema/render-line";

const NOW = "2026-06-14T12:00:00.000Z";

const sampleVoice = {
  id: "mve_voice_1",
  userId: "local-user",
  name: "Test",
  language: "de",
  engine: "kokoro",
  type: "default" as const,
  status: "ready" as const,
  baseVoiceId: "af_bella",
  consentStatus: "not_required" as const,
  commercialUseAllowed: false,
  version: 1,
  createdAt: NOW,
  updatedAt: NOW,
};

const sampleLine = {
  id: "mve_line_1",
  sceneId: "scene_1",
  orderIndex: 0,
  type: "dialogue" as const,
  status: "dirty" as const,
  createdAt: NOW,
  updatedAt: NOW,
};

describe("RenderLineInputSchema", () => {
  it("accepts kokoro render input", () => {
    const result = RenderLineInputSchema.safeParse({
      lineId: "mve_line_1",
      text: "Hallo Welt.",
      language: "de",
      voice: sampleVoice,
      takeIndex: 0,
      projectDir: "/tmp/project",
    });
    expect(result.success).toBe(true);
  });
});

describe("MveAudioJobSchema", () => {
  it("accepts job with snapshot", () => {
    const result = MveAudioJobSchema.safeParse({
      id: "mve_job_1",
      projectId: "proj_1",
      lineId: "mve_line_1",
      status: "pending",
      engine: "kokoro",
      takeCount: 2,
      scriptSnapshot: { line: sampleLine, voice: sampleVoice },
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(result.success).toBe(true);
  });
});

describe("MveTakeSchema", () => {
  it("accepts ready take", () => {
    const result = MveTakeSchema.safeParse({
      id: "mve_take_1",
      lineId: "mve_line_1",
      jobId: "mve_job_1",
      takeIndex: 0,
      audioUrl: "/path/to.wav",
      durationMs: 1200,
      isSelected: true,
      status: "ready",
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(result.success).toBe(true);
  });
});
