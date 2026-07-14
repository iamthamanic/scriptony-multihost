/**
 * Tests for saving a chosen voice design candidate.
 * Location: src/lib/mve/casting/__tests__/save-voice-design-candidate.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/runtime/detect-runtime", () => ({
  isDesktopShell: () => true,
}));

vi.mock("../../materialize/materialize-designed-voice", () => ({
  materializeDesignedVoice: vi.fn().mockResolvedValue({
    profile: {
      id: "mve-1",
      baseVoiceId: "vb-cloned-1",
      engine: "voicebox",
      creationMode: "designed",
      provider: "qwen",
    },
    baseVoiceId: "vb-cloned-1",
  }),
}));

vi.mock("@/lib/api-adapter/mve-adapter", () => ({
  updateMveVoiceProfile: vi.fn().mockImplementation(async (id, patch) => ({
    id,
    ...patch,
    baseVoiceId: "vb-cloned-1",
    engine: "voicebox",
  })),
}));

import { updateMveVoiceProfile } from "@/lib/api-adapter/mve-adapter";
import { materializeDesignedVoice } from "../../materialize/materialize-designed-voice";
import { saveVoiceDesignCandidate } from "../save-voice-design-candidate";

const session = {
  sessionId: "vd_sess_test",
  designPrompt: "warm narrator",
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
  ],
};

describe("saveVoiceDesignCandidate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("materializes via Qwen pipeline and updates MVE profile", async () => {
    const result = await saveVoiceDesignCandidate({
      projectId: "proj-1",
      characterId: "char-1",
      characterName: "Max",
      voiceName: "warm",
      candidate: session.candidates[0]!,
      session,
      designPrompt: "warm narrator",
      designSpec: { native: { language: "German" } },
    });

    expect(materializeDesignedVoice).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "vd_sess_test",
        candidateId: "candidate-1",
        name: "warm",
        characterId: "char-1",
      }),
    );
    expect(updateMveVoiceProfile).toHaveBeenCalledWith(
      "mve-1",
      expect.objectContaining({
        name: "Max — warm",
        type: "generated",
        consentStatus: "not_required",
        attributes: null,
        designSpec: { native: { language: "German" } },
      }),
    );
    expect(result.profile.type).toBe("generated");
  });

  it("rejects empty voice name", async () => {
    await expect(
      saveVoiceDesignCandidate({
        projectId: "proj-1",
        characterId: "char-1",
        characterName: "Max",
        voiceName: "  ",
        candidate: session.candidates[0]!,
        session,
        designPrompt: "warm narrator",
      }),
    ).rejects.toThrow(/Namen/);
  });
});
