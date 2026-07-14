/**
 * Tests for single voice design candidate regeneration.
 * Location: src/lib/mve/casting/__tests__/regenerate-voice-design-candidate.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/voicebox-api", () => ({
  ensureVoiceboxSidecar: vi.fn().mockResolvedValue(undefined),
  createDesignedVoiceboxProfile: vi.fn().mockResolvedValue({
    id: "vb-new",
    name: "preview",
    language: "de",
  }),
  deleteVoiceboxProfile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../synthesize-voice-design-candidate-preview", () => ({
  synthesizeVoiceDesignCandidatePreview: vi.fn().mockResolvedValue({
    id: "s1-1",
    voiceboxProfileId: "vb-new",
    index: 1,
    label: "B",
    previewAudioPath: "/tmp/new.wav",
    variationAttempt: 1,
  }),
}));

import {
  createDesignedVoiceboxProfile,
  deleteVoiceboxProfile,
} from "@/lib/api/voicebox-api";
import { regenerateVoiceDesignCandidate } from "../regenerate-voice-design-candidate";
import { synthesizeVoiceDesignCandidatePreview } from "../synthesize-voice-design-candidate-preview";

const session = {
  sessionId: "s1",
  designPrompt: "warm narrator",
  designSpec: null,
  candidates: [
    {
      id: "s1-1",
      voiceboxProfileId: "vb-old",
      index: 1 as const,
      label: "B" as const,
    },
  ],
};

describe("regenerateVoiceDesignCandidate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("replaces profile and re-synthesizes one candidate", async () => {
    const result = await regenerateVoiceDesignCandidate({
      session,
      candidate: session.candidates[0]!,
      characterName: "Max",
      projectDir: "/proj",
    });

    expect(deleteVoiceboxProfile).toHaveBeenCalledWith("vb-old");
    expect(createDesignedVoiceboxProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        designPrompt: expect.stringContaining("variant"),
      }),
    );
    expect(synthesizeVoiceDesignCandidatePreview).toHaveBeenCalledTimes(1);
    expect(result.previewAudioPath).toBe("/tmp/new.wav");
    expect(result.variationAttempt).toBe(1);
  });
});
