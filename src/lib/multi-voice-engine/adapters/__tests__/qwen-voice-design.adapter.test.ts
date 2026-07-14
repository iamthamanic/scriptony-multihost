/**
 * Tests for QwenVoiceDesignAdapter.
 * Location: src/lib/multi-voice-engine/adapters/__tests__/qwen-voice-design.adapter.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/local/voice-design-sidecar-lifecycle", () => ({
  ensureVoiceDesignSidecarReady: vi.fn(async () => undefined),
}));

vi.mock("@/lib/api/qwen-voice-design-api", () => ({
  generateQwenVoiceDesignCandidates: vi.fn(),
  materializeQwenVoiceDesign: vi.fn(),
  QWEN_VOICE_DESIGN_DEFAULT_CANDIDATE_COUNT: 3,
  QWEN_VOICE_DESIGN_MAX_CANDIDATE_COUNT: 4,
}));

import {
  generateQwenVoiceDesignCandidates,
  materializeQwenVoiceDesign,
} from "@/lib/api/qwen-voice-design-api";
import { ensureVoiceDesignSidecarReady } from "@/lib/local/voice-design-sidecar-lifecycle";
import { qwenVoiceDesignAdapter } from "../qwen-voice-design.adapter";

describe("QwenVoiceDesignAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes provider id and capabilities", () => {
    expect(qwenVoiceDesignAdapter.providerId).toBe("qwen-voice-design");
    expect(qwenVoiceDesignAdapter.capabilities.supportsVoiceDesign).toBe(true);
    expect(qwenVoiceDesignAdapter.capabilities.supportsMaterialize).toBe(true);
    expect(qwenVoiceDesignAdapter.capabilities.maxCandidateCount).toBe(4);
  });

  it("generateCandidates ensures sidecar and maps response", async () => {
    vi.mocked(generateQwenVoiceDesignCandidates).mockResolvedValueOnce({
      sessionId: "vd_sess_test",
      candidates: [
        {
          id: "candidate-1",
          label: "A",
          audioUrl:
            "local://voice-design/sessions/vd_sess_test/candidate-1.wav",
          description: "Weibliche Stimme",
          durationMs: 4000,
          sampleRate: 24000,
        },
      ],
      warnings: ["candidate-2: timeout"],
    });

    const result = await qwenVoiceDesignAdapter.generateCandidates({
      description: "Weibliche Stimme",
      previewText: "Hallo Welt",
      language: "German",
      candidateCount: 3,
    });

    expect(ensureVoiceDesignSidecarReady).toHaveBeenCalled();
    expect(generateQwenVoiceDesignCandidates).toHaveBeenCalledWith({
      description: "Weibliche Stimme",
      previewText: "Hallo Welt",
      language: "German",
      candidateCount: 3,
    });
    expect(result.sessionId).toBe("vd_sess_test");
    expect(result.candidates[0]?.label).toBe("A");
  });

  it("materialize ensures sidecar and maps response", async () => {
    vi.mocked(materializeQwenVoiceDesign).mockResolvedValueOnce({
      referenceAudioAssetId: "asset_1",
      referenceAudioUrl: "assets/voice-refs/pazuzu.wav",
      referenceText: "Natürlich habe ich recht.",
      identityPrompt: "Weibliche Stimme, jung, hell",
      voiceProfileDraft: {
        creationMode: "designed",
        provider: "qwen",
        model: "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
      },
    });

    const result = await qwenVoiceDesignAdapter.materialize({
      sessionId: "vd_sess_test",
      candidateId: "candidate-1",
      name: "Pazuzu",
      previewText: "Natürlich habe ich recht.",
      projectId: "proj_1",
      projectDir: "/tmp/project.scriptony",
    });

    expect(ensureVoiceDesignSidecarReady).toHaveBeenCalled();
    expect(materializeQwenVoiceDesign).toHaveBeenCalledWith({
      sessionId: "vd_sess_test",
      candidateId: "candidate-1",
      name: "Pazuzu",
      previewText: "Natürlich habe ich recht.",
      projectId: "proj_1",
      projectDir: "/tmp/project.scriptony",
    });
    expect(result.referenceAudioAssetId).toBe("asset_1");
    expect(result.identityPrompt).toContain("Weibliche");
  });
});
