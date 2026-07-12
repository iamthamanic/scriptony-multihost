/**
 * Tests for VoiceboxVoiceEngineAdapter.
 * Location: src/lib/multi-voice-engine/adapters/__tests__/voicebox.adapter.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/voicebox-api", () => ({
  ensureVoiceboxAvailable: vi.fn(async () => undefined),
  generateVoiceboxSpeech: vi.fn(async () => ({
    audioPath: "/tmp/proj/.scriptony/voicebox-output/vb-test.wav",
    durationMs: 1200,
  })),
}));

import {
  ensureVoiceboxAvailable,
  generateVoiceboxSpeech,
} from "@/lib/api/voicebox-api";
import { voiceboxVoiceEngineAdapter } from "../voicebox.adapter";

const NOW = "2026-07-10T12:00:00.000Z";

describe("VoiceboxVoiceEngineAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders line via Voicebox generate API", async () => {
    const result = await voiceboxVoiceEngineAdapter.renderLine({
      lineId: "mve_line_1",
      text: "Testzeile.",
      language: "de",
      voice: {
        id: "v1",
        userId: "local-user",
        name: "Preview",
        language: "de",
        engine: "voicebox",
        type: "default",
        status: "ready",
        baseVoiceId: "profile-abc",
        consentStatus: "not_required",
        commercialUseAllowed: false,
        version: 1,
        createdAt: NOW,
        updatedAt: NOW,
      },
      takeIndex: 0,
      projectDir: "/tmp/proj",
    });

    expect(ensureVoiceboxAvailable).toHaveBeenCalled();
    expect(generateVoiceboxSpeech).toHaveBeenCalledWith({
      text: "Testzeile.",
      profileId: "profile-abc",
      language: "de",
      projectDir: "/tmp/proj",
    });
    expect(result.audioUrl).toContain("voicebox-output");
    expect(result.durationMs).toBe(1200);
  });

  it("throws when voice profile has no baseVoiceId", async () => {
    await expect(
      voiceboxVoiceEngineAdapter.renderLine({
        lineId: "mve_line_1",
        text: "Test.",
        language: "de",
        voice: {
          id: "v1",
          userId: "local-user",
          name: "Preview",
          language: "de",
          engine: "voicebox",
          type: "default",
          status: "ready",
          consentStatus: "not_required",
          commercialUseAllowed: false,
          version: 1,
          createdAt: NOW,
          updatedAt: NOW,
        },
        takeIndex: 0,
        projectDir: "/tmp/proj",
      }),
    ).rejects.toThrow(/profile_id/);
  });
});
