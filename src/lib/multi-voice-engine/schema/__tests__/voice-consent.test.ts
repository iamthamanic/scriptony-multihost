/**
 * Tests for MveVoiceConsent schema.
 * Location: src/lib/multi-voice-engine/schema/__tests__/voice-consent.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  MveVoiceConsentSchema,
  pickLatestVerifiedVoiceConsent,
  type MveVoiceConsent,
} from "../voice-consent";

describe("MveVoiceConsent schema", () => {
  const prdExample = {
    id: "mvc_prd_1",
    projectId: "proj_demo",
    voiceId: "mve_voice_clone_1",
    userId: "local-user",
    consentTextVersion: "2026-06-01",
    consentConfirmedAt: "2026-06-24T12:00:00.000Z",
    sourceAudioHash:
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    commercialUseAllowed: false,
    status: "verified",
    createdAt: "2026-06-24T12:00:00.000Z",
    updatedAt: "2026-06-24T12:00:00.000Z",
  };

  it("accepts PRD example payload", () => {
    const parsed = MveVoiceConsentSchema.safeParse(prdExample);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.voiceId).toBe("mve_voice_clone_1");
      expect(parsed.data.commercialUseAllowed).toBe(false);
    }
  });

  it("rejects invalid sourceAudioHash", () => {
    const parsed = MveVoiceConsentSchema.safeParse({
      ...prdExample,
      sourceAudioHash: "not-a-hash",
    });
    expect(parsed.success).toBe(false);
  });

  it("defaults status to verified", () => {
    const parsed = MveVoiceConsentSchema.safeParse({
      ...prdExample,
      status: undefined,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe("verified");
    }
  });

  it("pickLatestVerifiedVoiceConsent prefers newest verified record", () => {
    const older: MveVoiceConsent = {
      ...prdExample,
      id: "mvc_old",
      consentConfirmedAt: "2026-06-01T00:00:00.000Z",
      status: "verified",
    };
    const newer: MveVoiceConsent = {
      ...prdExample,
      id: "mvc_new",
      consentConfirmedAt: "2026-06-24T12:00:00.000Z",
      status: "verified",
    };
    const rejected: MveVoiceConsent = {
      ...prdExample,
      id: "mvc_rejected",
      status: "rejected",
      consentConfirmedAt: "2026-06-25T00:00:00.000Z",
    };

    expect(pickLatestVerifiedVoiceConsent([older, newer, rejected])?.id).toBe(
      "mvc_new",
    );
  });
});
