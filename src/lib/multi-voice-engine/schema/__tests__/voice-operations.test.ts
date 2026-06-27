/**
 * Tests for MVE Voice Studio operation input schemas.
 * Location: src/lib/multi-voice-engine/schema/__tests__/voice-operations.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  MveCloneVoiceInputSchema,
  MveGenerateVoiceInputSchema,
  MveTuneVoiceInputSchema,
  MveVoiceRequestSchema,
} from "../voice-operations";

describe("MveVoice operation schemas", () => {
  it("accepts generate input for attribute matching", () => {
    const parsed = MveGenerateVoiceInputSchema.safeParse({
      projectId: "proj_demo",
      name: "Ermittlerin",
      description: "ruhige deutsche Ermittlerin, Mitte 30",
      attributes: {
        genderPresentation: "female",
        ageImpression: "middle_aged",
        pace: "medium",
      },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.language).toBe("de");
    }
  });

  it("accepts clone input with consent reference", () => {
    const parsed = MveCloneVoiceInputSchema.safeParse({
      projectId: "proj_demo",
      name: "Klon — Protagonist",
      referenceAudioUrl: "assets/voice-refs/ref.wav",
      sourceAudioHash:
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      consentId: "mvc_prd_1",
      commercialUseAllowed: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts tune input with base voice", () => {
    const parsed = MveTuneVoiceInputSchema.safeParse({
      projectId: "proj_demo",
      name: "Heldin — warm",
      baseVoiceId: "mve_voice_base_1",
      defaultSettings: { speed: 0.95, stability: 0.6 },
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts voice request record payload", () => {
    const parsed = MveVoiceRequestSchema.safeParse({
      id: "mvr_1",
      projectId: "proj_demo",
      voiceProfileId: "mve_voice_clone_1",
      operationType: "clone",
      status: "pending",
      inputJson: JSON.stringify({ consentId: "mvc_prd_1" }),
      createdAt: "2026-06-24T12:00:00.000Z",
      updatedAt: "2026-06-24T12:00:00.000Z",
    });
    expect(parsed.success).toBe(true);
  });
});
