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
  QWEN_VOICE_DESIGN_DEFAULT_CANDIDATE_COUNT: 3,
  QWEN_VOICE_DESIGN_MAX_CANDIDATE_COUNT: 4,
}));

import { generateQwenVoiceDesignCandidates } from "@/lib/api/qwen-voice-design-api";
import { ensureVoiceDesignSidecarReady } from "@/lib/local/voice-design-sidecar-lifecycle";
import {
  qwenVoiceDesignAdapter,
  QwenVoiceDesignNotImplementedError,
} from "../qwen-voice-design.adapter";

describe("QwenVoiceDesignAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes provider id and capabilities", () => {
    expect(qwenVoiceDesignAdapter.providerId).toBe("qwen-voice-design");
    expect(qwenVoiceDesignAdapter.capabilities.supportsVoiceDesign).toBe(true);
    expect(qwenVoiceDesignAdapter.capabilities.supportsMaterialize).toBe(false);
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

  it("materialize throws not implemented", async () => {
    await expect(
      qwenVoiceDesignAdapter.materialize({
        sessionId: "vd_sess_test",
        candidateId: "candidate-1",
        name: "Test",
        previewText: "Hi",
        projectId: "proj_1",
        projectDir: "/tmp/project.scriptony",
      }),
    ).rejects.toThrow(QwenVoiceDesignNotImplementedError);
  });
});
