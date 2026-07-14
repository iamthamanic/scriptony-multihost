/**
 * Tests for saving a chosen voice design candidate.
 * Location: src/lib/mve/casting/__tests__/save-voice-design-candidate.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/runtime/detect-runtime", () => ({
  isDesktopShell: () => true,
}));

vi.mock("@/lib/api/voicebox-api", () => ({
  updateVoiceboxProfile: vi.fn().mockResolvedValue(undefined),
  deleteVoiceboxProfile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../assign-voice-profile", () => ({
  assignMveVoiceToCharacter: vi.fn().mockResolvedValue({
    id: "mve-1",
    baseVoiceId: "vb-chosen",
    engine: "voicebox",
  }),
}));

vi.mock("@/lib/api-adapter/mve-adapter", () => ({
  updateMveVoiceProfile: vi.fn().mockImplementation(async (id, patch) => ({
    id,
    ...patch,
    baseVoiceId: "vb-chosen",
    engine: "voicebox",
  })),
}));

import { updateVoiceboxProfile } from "@/lib/api/voicebox-api";
import { updateMveVoiceProfile } from "@/lib/api-adapter/mve-adapter";
import { assignMveVoiceToCharacter } from "../../assign-voice-profile";
import { saveVoiceDesignCandidate } from "../save-voice-design-candidate";

const session = {
  sessionId: "sess-1",
  designPrompt: "warm narrator",
  designSpec: null,
  candidates: [
    {
      id: "sess-1-0",
      voiceboxProfileId: "vb-chosen",
      index: 0 as const,
      label: "A" as const,
    },
    {
      id: "sess-1-1",
      voiceboxProfileId: "vb-other",
      index: 1 as const,
      label: "B" as const,
    },
  ],
};

describe("saveVoiceDesignCandidate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renames voicebox profile, assigns MVE, and cleans up other candidates", async () => {
    const result = await saveVoiceDesignCandidate({
      projectId: "proj-1",
      characterId: "char-1",
      characterName: "Max",
      voiceName: "Max — warm",
      candidate: session.candidates[0]!,
      session,
      designPrompt: "warm narrator",
      designSpec: { native: { language: "German" } },
    });

    expect(updateVoiceboxProfile).toHaveBeenCalledWith(
      "vb-chosen",
      expect.objectContaining({ name: "Max — warm" }),
    );
    expect(assignMveVoiceToCharacter).toHaveBeenCalled();
    expect(updateMveVoiceProfile).toHaveBeenCalledWith(
      "mve-1",
      expect.objectContaining({
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
