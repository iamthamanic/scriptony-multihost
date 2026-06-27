/**
 * Tests for voice clone consent guards and hashing.
 * Location: src/lib/mve/safety/__tests__/voice-consent-flow.test.ts
 */

import { describe, expect, it } from "vitest";
import type { MveVoiceConsent } from "@/lib/multi-voice-engine/schema/voice-consent";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import {
  canStartVoiceClone,
  voiceCloneBlockedReason,
} from "../can-start-voice-clone";
import { sha256HexFromArrayBuffer } from "../sha256-hex";

describe("voice clone consent flow", () => {
  const hash =
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  const profile: MveVoiceProfile = {
    id: "mve_voice_1",
    userId: "local-user",
    name: "Test",
    language: "de",
    engine: "kokoro",
    type: "cloned",
    status: "ready",
    consentStatus: "verified",
    referenceAudioUrl: "assets/voice-refs/ref.wav",
    commercialUseAllowed: false,
    version: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const consent: MveVoiceConsent = {
    id: "mvc_1",
    projectId: "proj_1",
    voiceId: "mve_voice_1",
    userId: "local-user",
    consentTextVersion: "2026-06-01",
    consentConfirmedAt: "2026-01-01T00:00:00.000Z",
    sourceAudioHash: hash,
    commercialUseAllowed: false,
    status: "verified",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  it("allows clone when consent and profile are verified", () => {
    expect(canStartVoiceClone(profile, consent)).toBe(true);
    expect(voiceCloneBlockedReason(profile, consent)).toBeUndefined();
  });

  it("blocks clone when consent is missing hash", () => {
    expect(
      canStartVoiceClone(profile, { ...consent, sourceAudioHash: undefined }),
    ).toBe(false);
  });

  it("blocks clone when profile consentStatus is blocked", () => {
    expect(
      canStartVoiceClone(
        { ...profile, consentStatus: "blocked", status: "blocked" },
        consent,
      ),
    ).toBe(false);
    expect(
      voiceCloneBlockedReason(
        { ...profile, consentStatus: "blocked", status: "blocked" },
        consent,
      ),
    ).toContain("gesperrt");
  });

  it("sha256HexFromArrayBuffer matches empty string digest", async () => {
    const digest = await sha256HexFromArrayBuffer(new ArrayBuffer(0));
    expect(digest).toBe(hash);
  });
});
