/**
 * Tests for MVE voice profile assign upsert.
 * Location: src/lib/mve/__tests__/assign-voice-profile.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { assignMveVoiceToCharacter } from "../assign-voice-profile";
import { DEFAULT_VOICE_ENGINE } from "@/lib/config/voice-engine";

vi.mock("@/lib/api-adapter/mve-adapter", () => ({
  createMveVoiceProfile: vi.fn(),
  updateMveVoiceProfile: vi.fn(),
}));

import {
  createMveVoiceProfile,
  updateMveVoiceProfile,
} from "@/lib/api-adapter/mve-adapter";

const existingProfile = {
  id: "mve_voice_1",
  userId: "local-user",
  name: "Max — Stimme",
  language: "de",
  engine: "kokoro",
  type: "default" as const,
  status: "ready" as const,
  characterId: "char_1",
  baseVoiceId: "af_old",
  consentStatus: "not_required" as const,
  commercialUseAllowed: false,
  version: 1,
  createdAt: "2026-06-24T10:00:00.000Z",
  updatedAt: "2026-06-24T10:00:00.000Z",
};

describe("assignMveVoiceToCharacter", () => {
  beforeEach(() => {
    vi.mocked(createMveVoiceProfile).mockReset();
    vi.mocked(updateMveVoiceProfile).mockReset();
  });

  it("updates when profile exists", async () => {
    vi.mocked(updateMveVoiceProfile).mockResolvedValue({
      ...existingProfile,
      baseVoiceId: "af_bella",
    });

    await assignMveVoiceToCharacter({
      projectId: "proj_1",
      characterId: "char_1",
      characterName: "Max",
      voiceId: "af_bella",
      existingProfile,
    });

    expect(updateMveVoiceProfile).toHaveBeenCalledWith("mve_voice_1", {
      baseVoiceId: "af_bella",
      engine: DEFAULT_VOICE_ENGINE,
      status: "ready",
      previewText: expect.stringContaining("Max"),
    });
    expect(createMveVoiceProfile).not.toHaveBeenCalled();
  });

  it("creates when no profile exists", async () => {
    vi.mocked(createMveVoiceProfile).mockResolvedValue(existingProfile);

    await assignMveVoiceToCharacter({
      projectId: "proj_1",
      characterId: "char_1",
      characterName: "Max",
      voiceId: "af_bella",
    });

    expect(createMveVoiceProfile).toHaveBeenCalledWith(
      "proj_1",
      expect.objectContaining({
        characterId: "char_1",
        baseVoiceId: "af_bella",
        engine: DEFAULT_VOICE_ENGINE,
        status: "ready",
      }),
    );
    expect(updateMveVoiceProfile).not.toHaveBeenCalled();
  });
});
