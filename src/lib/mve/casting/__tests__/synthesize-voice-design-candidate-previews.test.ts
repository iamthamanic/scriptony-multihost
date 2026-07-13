/**
 * Tests for voice design candidate preview synthesis.
 * Location: src/lib/mve/casting/__tests__/synthesize-voice-design-candidate-previews.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/voicebox-api", () => ({
  ensureVoiceboxSidecar: vi.fn().mockResolvedValue(undefined),
  generateVoiceboxSpeech: vi.fn().mockResolvedValue({
    audioPath: "/tmp/preview.wav",
    durationMs: 1200,
  }),
}));

vi.mock("../synthesize-voice-design-candidate-preview", () => ({
  synthesizeVoiceDesignCandidatePreview: vi
    .fn()
    .mockImplementation(async ({ candidate }) => ({
      ...candidate,
      previewAudioPath: "/tmp/preview.wav",
    })),
}));

import { ensureVoiceboxSidecar } from "@/lib/api/voicebox-api";
import { synthesizeVoiceDesignCandidatePreview } from "../synthesize-voice-design-candidate-preview";
import { synthesizeVoiceDesignCandidatePreviews } from "../synthesize-voice-design-candidate-previews";

const session = {
  sessionId: "s1",
  designPrompt: "warm",
  designSpec: null,
  candidates: [
    {
      id: "s1-0",
      voiceboxProfileId: "vb-a",
      index: 0 as const,
      label: "A" as const,
    },
    {
      id: "s1-1",
      voiceboxProfileId: "vb-b",
      index: 1 as const,
      label: "B" as const,
    },
    {
      id: "s1-2",
      voiceboxProfileId: "vb-c",
      index: 2 as const,
      label: "C" as const,
    },
  ],
};

describe("synthesizeVoiceDesignCandidatePreviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("synthesizes preview audio for each candidate without playback", async () => {
    const progressCalls: string[] = [];

    const results = await synthesizeVoiceDesignCandidatePreviews({
      session,
      characterName: "Max",
      previewText: "Hallo Welt.",
      projectDir: "/proj",
      onCandidateProgress: (id, progress) => {
        progressCalls.push(`${id}:${progress.status}`);
      },
    });

    expect(ensureVoiceboxSidecar).toHaveBeenCalled();
    expect(synthesizeVoiceDesignCandidatePreview).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(3);
    expect(
      results.every((c) => c.previewAudioPath === "/tmp/preview.wav"),
    ).toBe(true);
    expect(progressCalls.at(-1)).toBe("s1-2:ready");
  });

  it("reports error state when synthesis fails", async () => {
    vi.mocked(synthesizeVoiceDesignCandidatePreview).mockRejectedValueOnce(
      new Error("fail"),
    );

    const results = await synthesizeVoiceDesignCandidatePreviews({
      session,
      characterName: "Max",
      projectDir: "/proj",
      onCandidateProgress: () => undefined,
    });

    expect(results[0]?.previewAudioPath).toBeUndefined();
    expect(results[0]?.errorMessage).toBe("fail");
    expect(results[1]?.previewAudioPath).toBe("/tmp/preview.wav");
  });

  it("skips candidates without a voicebox profile id", async () => {
    const brokenSession = {
      ...session,
      candidates: [
        session.candidates[0]!,
        {
          ...session.candidates[1]!,
          voiceboxProfileId: "",
          errorMessage: "Profil fehlgeschlagen",
        },
        session.candidates[2]!,
      ],
    };

    const results = await synthesizeVoiceDesignCandidatePreviews({
      session: brokenSession,
      characterName: "Max",
      projectDir: "/proj",
      onCandidateProgress: () => undefined,
    });

    expect(synthesizeVoiceDesignCandidatePreview).toHaveBeenCalledTimes(2);
    expect(results[1]?.errorMessage).toBe("Profil fehlgeschlagen");
  });
});
