/**
 * Tests for voice design candidate preview synthesis.
 * Location: src/lib/mve/casting/__tests__/synthesize-voice-design-candidate-previews.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../synthesize-voice-design-candidate-preview", () => ({
  synthesizeVoiceDesignCandidatePreview: vi
    .fn()
    .mockImplementation(async ({ candidate }) => ({
      ...candidate,
      previewAudioPath: "blob:preview",
    })),
}));

import { synthesizeVoiceDesignCandidatePreview } from "../synthesize-voice-design-candidate-preview";
import { synthesizeVoiceDesignCandidatePreviews } from "../synthesize-voice-design-candidate-previews";

const session = {
  sessionId: "vd_sess_test",
  designPrompt: "warm",
  designSpec: null,
  candidates: [
    {
      id: "candidate-1",
      providerSessionId: "vd_sess_test",
      providerCandidateId: "candidate-1",
      index: 0 as const,
      label: "A" as const,
      audioUrl: "local://voice-design/sessions/vd_sess_test/candidate-1.wav",
    },
    {
      id: "candidate-2",
      providerSessionId: "vd_sess_test",
      providerCandidateId: "candidate-2",
      index: 1 as const,
      label: "B" as const,
      audioUrl: "local://voice-design/sessions/vd_sess_test/candidate-2.wav",
    },
    {
      id: "candidate-3",
      providerSessionId: "vd_sess_test",
      providerCandidateId: "candidate-3",
      index: 2 as const,
      label: "C" as const,
      audioUrl: "local://voice-design/sessions/vd_sess_test/candidate-3.wav",
    },
  ],
};

describe("synthesizeVoiceDesignCandidatePreviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prepares preview playback for each candidate", async () => {
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

    expect(synthesizeVoiceDesignCandidatePreview).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(3);
    expect(results.every((c) => c.previewAudioPath === "blob:preview")).toBe(
      true,
    );
    expect(progressCalls.at(-1)).toBe("candidate-3:ready");
  });

  it("reports error state when playback prep fails", async () => {
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
    expect(results[1]?.previewAudioPath).toBe("blob:preview");
  });

  it("skips candidates without audioUrl", async () => {
    const brokenSession = {
      ...session,
      candidates: [
        session.candidates[0]!,
        {
          ...session.candidates[1]!,
          audioUrl: undefined,
          errorMessage: "Generierung fehlgeschlagen",
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
    expect(results[1]?.errorMessage).toBe("Generierung fehlgeschlagen");
  });
});
