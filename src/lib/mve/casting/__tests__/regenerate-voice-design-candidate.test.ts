/**
 * Tests for single voice design candidate regeneration.
 * Location: src/lib/mve/casting/__tests__/regenerate-voice-design-candidate.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const generateCandidates = vi.fn();

vi.mock("@/lib/multi-voice-engine/adapters/voice-creation-registry", () => ({
  resolveVoiceCreationAdapter: () => ({
    providerId: "qwen-voice-design",
    generateCandidates,
  }),
}));

vi.mock("../synthesize-voice-design-candidate-preview", () => ({
  synthesizeVoiceDesignCandidatePreview: vi.fn().mockResolvedValue({
    id: "candidate-1",
    providerSessionId: "vd_sess_retry",
    providerCandidateId: "candidate-1",
    index: 1,
    label: "B",
    audioUrl: "local://voice-design/sessions/vd_sess_retry/candidate-1.wav",
    previewAudioPath: "blob:mock",
    variationAttempt: 1,
  }),
}));

import { regenerateVoiceDesignCandidate } from "../regenerate-voice-design-candidate";
import { synthesizeVoiceDesignCandidatePreview } from "../synthesize-voice-design-candidate-preview";

const session = {
  sessionId: "vd_sess_test",
  designPrompt: "warm narrator",
  designSpec: null,
  candidates: [
    {
      id: "candidate-2",
      providerSessionId: "vd_sess_test",
      providerCandidateId: "candidate-2",
      index: 1 as const,
      label: "B" as const,
      audioUrl: "local://voice-design/sessions/vd_sess_test/candidate-2.wav",
    },
  ],
};

describe("regenerateVoiceDesignCandidate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateCandidates.mockResolvedValue({
      sessionId: "vd_sess_retry",
      candidates: [
        {
          id: "candidate-1",
          label: "A",
          audioUrl:
            "local://voice-design/sessions/vd_sess_retry/candidate-1.wav",
          description: "warm narrator",
        },
      ],
    });
  });

  it("regenerates one candidate via VoiceCreationAdapter", async () => {
    const result = await regenerateVoiceDesignCandidate({
      session,
      candidate: session.candidates[0]!,
      characterName: "Max",
      projectDir: "/proj",
    });

    expect(generateCandidates).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateCount: 1,
        description: expect.stringContaining("variant"),
      }),
    );
    expect(synthesizeVoiceDesignCandidatePreview).toHaveBeenCalledTimes(1);
    expect(result.previewAudioPath).toBe("blob:mock");
    expect(result.variationAttempt).toBe(1);
    expect(result.providerSessionId).toBe("vd_sess_retry");
  });
});
