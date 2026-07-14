/**
 * Tests for prompt-to-voice design flow (legacy one-shot wrapper).
 * Location: src/lib/mve/casting/__tests__/design-voice-from-prompt.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";

vi.mock("@/runtime/detect-runtime", () => ({
  isDesktopShell: () => true,
}));

vi.mock("../preview-voice-design-candidates", () => ({
  previewVoiceDesignCandidates: vi.fn().mockResolvedValue({
    sessionId: "sess-1",
    designPrompt: "warme ruhige Erzählerstimme",
    designSpec: null,
    candidates: [
      {
        id: "candidate-1",
        providerSessionId: "sess-1",
        providerCandidateId: "candidate-1",
        index: 0,
        label: "A",
      },
    ],
  }),
}));

vi.mock("../save-voice-design-candidate", () => ({
  saveVoiceDesignCandidate: vi.fn().mockResolvedValue({
    profile: {
      id: "mve-1",
      baseVoiceId: "vb-designed-1",
      engine: "voicebox",
      type: "generated",
      description: "warme ruhige Erzählerstimme",
    } satisfies Partial<MveVoiceProfile>,
    voiceboxProfileName: "Pazulu — designt",
    hint: "saved",
  }),
}));

import { previewVoiceDesignCandidates } from "../preview-voice-design-candidates";
import { saveVoiceDesignCandidate } from "../save-voice-design-candidate";
import { designVoiceFromPrompt } from "../design-voice-from-prompt";

describe("designVoiceFromPrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("previews one candidate then saves with default name", async () => {
    const result = await designVoiceFromPrompt({
      projectId: "proj-1",
      projectDir: "/proj",
      characterId: "char-1",
      characterName: "Pazulu",
      description: "warme ruhige Erzählerstimme",
    });

    expect(previewVoiceDesignCandidates).toHaveBeenCalledWith(
      expect.objectContaining({
        characterName: "Pazulu",
        basicDescription: "warme ruhige Erzählerstimme",
        count: 1,
      }),
    );
    expect(saveVoiceDesignCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        voiceName: "Pazulu — designt",
        designPrompt: "warme ruhige Erzählerstimme",
      }),
    );
    expect(result.profile.type).toBe("generated");
    expect(result.voiceboxProfileName).toBe("Pazulu — designt");
  });

  it("rejects empty description", async () => {
    await expect(
      designVoiceFromPrompt({
        projectId: "proj-1",
        projectDir: "/proj",
        characterId: "char-1",
        characterName: "Pazulu",
        description: "  ",
      }),
    ).rejects.toThrow(/Stimmbeschreibung/);
  });
});
