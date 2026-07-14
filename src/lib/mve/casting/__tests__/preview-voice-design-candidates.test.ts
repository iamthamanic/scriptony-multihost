/**
 * Tests for voice design preview candidates service.
 * Location: src/lib/mve/casting/__tests__/preview-voice-design-candidates.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/runtime/detect-runtime", () => ({
  isDesktopShell: () => true,
}));

vi.mock("@/lib/api/voicebox-api", () => ({
  ensureVoiceboxSidecar: vi.fn().mockResolvedValue(undefined),
  createDesignedVoiceboxProfile: vi
    .fn()
    .mockImplementation(async ({ name }: { name: string }) => ({
      id: `vb-${name}`,
      name,
      language: "de",
    })),
  generateVoiceboxSpeech: vi.fn().mockResolvedValue({
    audioPath: "/tmp/preview.wav",
  }),
  deleteVoiceboxProfile: vi.fn().mockResolvedValue(undefined),
}));

import {
  createDesignedVoiceboxProfile,
  deleteVoiceboxProfile,
  generateVoiceboxSpeech,
} from "@/lib/api/voicebox-api";
import {
  discardVoiceDesignPreviewSession,
  previewVoiceDesignCandidates,
} from "../preview-voice-design-candidates";
import { VOICE_DESIGN_PREVIEW_COUNT } from "../voice-design-candidate";

describe("previewVoiceDesignCandidates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates three ephemeral designed profiles without eager TTS", async () => {
    const session = await previewVoiceDesignCandidates({
      characterName: "Max",
      basicDescription: "warme Erzählerstimme",
      projectDir: "/proj",
    });

    expect(createDesignedVoiceboxProfile).toHaveBeenCalledTimes(
      VOICE_DESIGN_PREVIEW_COUNT,
    );
    const calls = vi.mocked(createDesignedVoiceboxProfile).mock.calls;
    expect(calls[0]?.[0]?.designPrompt).toContain("variant A");
    expect(calls[1]?.[0]?.designPrompt).toContain("variant B");
    expect(calls[2]?.[0]?.designPrompt).toContain("variant C");
    expect(generateVoiceboxSpeech).not.toHaveBeenCalled();
    expect(session.candidates).toHaveLength(VOICE_DESIGN_PREVIEW_COUNT);
    expect(session.candidates[0]?.label).toBe("A");
    expect(session.candidates[2]?.label).toBe("C");
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

  it("continues when one profile creation fails", async () => {
    vi.mocked(createDesignedVoiceboxProfile)
      .mockResolvedValueOnce({
        id: "vb-a",
        name: "a",
        language: "de",
      })
      .mockRejectedValueOnce(new Error("Design-Prompt zu lang"))
      .mockResolvedValueOnce({
        id: "vb-c",
        name: "c",
        language: "de",
      });

    const session = await previewVoiceDesignCandidates({
      characterName: "Max",
      basicDescription: "warme Erzählerstimme",
      projectDir: "/proj",
    });

    expect(session.candidates).toHaveLength(3);
    expect(session.candidates[0]?.voiceboxProfileId).toBe("vb-a");
    expect(session.candidates[1]?.voiceboxProfileId).toBe("");
    expect(session.candidates[1]?.errorMessage).toContain("zu lang");
    expect(session.candidates[2]?.voiceboxProfileId).toBe("vb-c");
  });
});

describe("discardVoiceDesignPreviewSession", () => {
  it("deletes all candidate profiles", async () => {
    await discardVoiceDesignPreviewSession({
      sessionId: "s1",
      designPrompt: "test",
      designSpec: null,
      candidates: [
        {
          id: "s1-0",
          voiceboxProfileId: "vb-a",
          index: 0,
          label: "A",
        },
        {
          id: "s1-1",
          voiceboxProfileId: "vb-b",
          index: 1,
          label: "B",
        },
      ],
    });

    expect(deleteVoiceboxProfile).toHaveBeenCalledWith("vb-a");
    expect(deleteVoiceboxProfile).toHaveBeenCalledWith("vb-b");
  });
});
