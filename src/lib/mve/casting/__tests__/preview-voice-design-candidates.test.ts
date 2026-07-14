/**
 * Tests for voice design preview candidates service.
 * Location: src/lib/mve/casting/__tests__/preview-voice-design-candidates.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/runtime/detect-runtime", () => ({
  isDesktopShell: () => true,
}));

const generateCandidates = vi.fn();

vi.mock("@/lib/multi-voice-engine/adapters/voice-creation-registry", () => ({
  resolveVoiceCreationAdapter: () => ({
    providerId: "qwen-voice-design",
    generateCandidates,
  }),
}));

import {
  discardVoiceDesignPreviewSession,
  previewVoiceDesignCandidates,
} from "../preview-voice-design-candidates";
import { VOICE_DESIGN_PREVIEW_COUNT } from "../voice-design-candidate";

describe("previewVoiceDesignCandidates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateCandidates.mockResolvedValue({
      sessionId: "vd_sess_test",
      candidates: [
        {
          id: "candidate-1",
          label: "A",
          audioUrl:
            "local://voice-design/sessions/vd_sess_test/candidate-1.wav",
          description: "warm",
        },
        {
          id: "candidate-2",
          label: "B",
          audioUrl:
            "local://voice-design/sessions/vd_sess_test/candidate-2.wav",
          description: "warm",
        },
        {
          id: "candidate-3",
          label: "C",
          audioUrl:
            "local://voice-design/sessions/vd_sess_test/candidate-3.wav",
          description: "warm",
        },
      ],
    });
  });

  it("generates three Qwen candidates without Voicebox designed profiles", async () => {
    const session = await previewVoiceDesignCandidates({
      characterName: "Max",
      basicDescription: "warme Erzählerstimme",
      projectDir: "/proj",
    });

    expect(generateCandidates).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining("warme Erzählerstimme"),
        language: "German",
        candidateCount: VOICE_DESIGN_PREVIEW_COUNT,
      }),
    );
    expect(session.candidates).toHaveLength(VOICE_DESIGN_PREVIEW_COUNT);
    expect(session.candidates[0]?.label).toBe("A");
    expect(session.candidates[0]?.providerSessionId).toBe("vd_sess_test");
    expect(session.candidates[0]?.audioUrl).toContain("candidate-1.wav");
    expect(session.candidates[0]?.previewAudioPath).toBeUndefined();
    expect(session.designPrompt).toContain("warme Erzählerstimme");
  });

  it("rejects empty description", async () => {
    await expect(
      previewVoiceDesignCandidates({
        characterName: "Max",
        basicDescription: "  ",
        projectDir: "/proj",
      }),
    ).rejects.toThrow(/Stimmbeschreibung/);
  });

  it("throws when adapter returns no audio candidates", async () => {
    generateCandidates.mockResolvedValueOnce({
      sessionId: "vd_sess_empty",
      candidates: [
        { id: "candidate-1", label: "A", audioUrl: "", description: "" },
      ],
    });

    await expect(
      previewVoiceDesignCandidates({
        characterName: "Max",
        basicDescription: "warme Erzählerstimme",
        projectDir: "/proj",
      }),
    ).rejects.toThrow(/Keine Stimm-Kandidaten/);
  });
});

describe("discardVoiceDesignPreviewSession", () => {
  it("is a no-op for Qwen sessions", async () => {
    await expect(
      discardVoiceDesignPreviewSession({
        sessionId: "s1",
        designPrompt: "test",
        designSpec: null,
        candidates: [
          {
            id: "candidate-1",
            providerSessionId: "vd_sess_test",
            providerCandidateId: "candidate-1",
            index: 0,
            label: "A",
          },
        ],
      }),
    ).resolves.toBeUndefined();
  });
});
