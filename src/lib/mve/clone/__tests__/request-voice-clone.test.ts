/**
 * Unit tests for voice clone request input building and guards.
 * Location: src/lib/mve/clone/__tests__/request-voice-clone.test.ts
 */

import { describe, expect, it } from "vitest";
import type { MveVoiceConsent } from "@/lib/multi-voice-engine/schema/voice-consent";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import { buildCloneVoiceInput } from "../request-voice-clone";
import {
  canStartVoiceClone,
  voiceCloneBlockedReason,
} from "@/lib/mve/safety/can-start-voice-clone";

const hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

const profile: MveVoiceProfile = {
  id: "mve_voice_clone_1",
  userId: "user_1",
  name: "Protagonist — Klon",
  language: "de",
  engine: "kokoro",
  type: "cloned",
  status: "ready",
  referenceAudioUrl: "assets/voice-refs/ref.wav",
  consentStatus: "verified",
  commercialUseAllowed: true,
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const consent: MveVoiceConsent = {
  id: "mvc_1",
  projectId: "proj_1",
  voiceId: profile.id,
  userId: "user_1",
  consentTextVersion: "2026-06-27",
  consentConfirmedAt: "2026-01-01T00:00:00.000Z",
  sourceAudioHash: hash,
  commercialUseAllowed: true,
  status: "verified",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("buildCloneVoiceInput", () => {
  it("builds valid clone input from profile + consent", () => {
    const input = buildCloneVoiceInput("proj_1", profile, consent);
    expect(input.consentId).toBe("mvc_1");
    expect(input.referenceAudioUrl).toBe("assets/voice-refs/ref.wav");
    expect(input.commercialUseAllowed).toBe(true);
  });
});

describe("clone request guards", () => {
  it("allows clone when consent verified", () => {
    expect(canStartVoiceClone(profile, consent)).toBe(true);
    expect(voiceCloneBlockedReason(profile, consent)).toBeUndefined();
  });

  it("blocks without verified consent", () => {
    expect(canStartVoiceClone(profile, null)).toBe(false);
    expect(voiceCloneBlockedReason(profile, null)).toMatch(/Consent/);
  });
});
