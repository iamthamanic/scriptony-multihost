/**
 * Tests for voice identity schema helpers.
 * Location: src/lib/multi-voice-engine/schema/__tests__/voice-identity.test.ts
 */

import { describe, expect, it } from "vitest";
import { parseMveVoiceProfile } from "../parse";
import { inferCreationModeFromProfileType } from "../voice-identity";

const NOW = "2026-07-14T12:00:00.000Z";

describe("inferCreationModeFromProfileType", () => {
  it("maps generated to designed", () => {
    expect(inferCreationModeFromProfileType("generated")).toBe("designed");
  });

  it("maps cloned to cloned", () => {
    expect(inferCreationModeFromProfileType("cloned")).toBe("cloned");
  });

  it("maps uploaded to recorded", () => {
    expect(inferCreationModeFromProfileType("uploaded")).toBe("recorded");
  });

  it("maps default to preset", () => {
    expect(inferCreationModeFromProfileType("default")).toBe("preset");
  });
});

describe("MveVoiceProfileSchema identity fields", () => {
  it("accepts optional identity fields", () => {
    const parsed = parseMveVoiceProfile({
      id: "mve_voice_1",
      userId: "local-user",
      name: "Pazuzu",
      engine: "voicebox",
      type: "generated",
      status: "ready",
      creationMode: "designed",
      provider: "qwen",
      model: "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
      identityPrompt: "Bright female voice, dry and precise",
      referenceAudioAssetId: "asset_1",
      referenceText: "Hello world",
      clonePromptAssetId: "asset_clone_1",
      consentStatus: "not_required",
      commercialUseAllowed: false,
      version: 1,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.creationMode).toBe("designed");
      expect(parsed.data.provider).toBe("qwen");
      expect(parsed.data.model).toContain("VoiceDesign");
    }
  });
});
