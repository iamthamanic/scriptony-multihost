/**
 * Unit tests for createTunedVoiceProfile guards.
 * Location: src/lib/mve/tune/__tests__/create-tuned-voice-profile.test.ts
 */

import { describe, expect, it } from "vitest";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import {
  canTuneVoiceProfile,
  voiceTuneBlockedReason,
} from "../create-tuned-voice-profile";

const baseProfile: MveVoiceProfile = {
  id: "mve_voice_base",
  userId: "user_1",
  name: "Heldin",
  language: "de",
  engine: "kokoro",
  type: "generated",
  status: "ready",
  baseVoiceId: "af_bella",
  consentStatus: "not_required",
  commercialUseAllowed: false,
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("createTunedVoiceProfile guards", () => {
  it("allows tuning a generated profile with Kokoro id", () => {
    expect(canTuneVoiceProfile(baseProfile)).toBe(true);
    expect(voiceTuneBlockedReason(baseProfile)).toBeUndefined();
  });

  it("blocks tune-of-tune (max one level)", () => {
    const tuned: MveVoiceProfile = {
      ...baseProfile,
      id: "mve_voice_tuned",
      type: "tuned",
      baseVoiceId: baseProfile.id,
    };
    expect(canTuneVoiceProfile(tuned)).toBe(false);
    expect(voiceTuneBlockedReason(tuned)).toMatch(/Tune-Ebene/);
  });

  it("blocks when base has no voice mapping", () => {
    const noVoice: MveVoiceProfile = {
      ...baseProfile,
      baseVoiceId: undefined,
    };
    expect(canTuneVoiceProfile(noVoice)).toBe(false);
  });
});
