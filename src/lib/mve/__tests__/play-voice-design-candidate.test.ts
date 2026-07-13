/**
 * Tests for live voice design candidate preview playback.
 * Location: src/lib/mve/__tests__/play-voice-design-candidate.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/runtime/detect-runtime", () => ({
  isDesktopShell: () => true,
}));

vi.mock("../play-voice-preview", () => ({
  playLocalVoicePreview: vi.fn().mockResolvedValue(undefined),
}));

import { playLocalVoicePreview } from "../play-voice-preview";
import { playVoiceDesignCandidateLive } from "../play-voice-design-candidate";

describe("playVoiceDesignCandidateLive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates TTS with current preview text and voicebox profile", async () => {
    await playVoiceDesignCandidateLive({
      voiceboxProfileId: "vb-candidate-1",
      previewText: "Neuer Standardsatz.",
      projectDir: "/proj",
      speed: 1.1,
    });

    expect(playLocalVoicePreview).toHaveBeenCalledWith(
      expect.objectContaining({
        voiceId: "vb-candidate-1",
        text: "Neuer Standardsatz.",
        projectDir: "/proj",
        speed: 1.1,
        engine: "voicebox",
      }),
    );
  });

  it("rejects empty preview text", async () => {
    await expect(
      playVoiceDesignCandidateLive({
        voiceboxProfileId: "vb-1",
        previewText: "  ",
        projectDir: "/proj",
      }),
    ).rejects.toThrow(/Standard-Satz/);
  });
});
