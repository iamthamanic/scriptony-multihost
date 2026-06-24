/**
 * Tests for MVE TTS voice id resolution.
 * Location: src/lib/mve/__tests__/resolve-tts-voice-id.test.ts
 */

import { describe, expect, it } from "vitest";
import { resolveMveTtsVoiceId } from "../resolve-tts-voice-id";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";

const baseProfile: MveVoiceProfile = {
  id: "mve_voice_1",
  userId: "local-user",
  name: "Test",
  language: "de",
  engine: "kokoro",
  type: "default",
  status: "ready",
  consentStatus: "not_required",
  commercialUseAllowed: false,
  version: 1,
  createdAt: "2026-06-24T10:00:00.000Z",
  updatedAt: "2026-06-24T10:00:00.000Z",
};

describe("resolveMveTtsVoiceId", () => {
  it("returns baseVoiceId when set", () => {
    expect(
      resolveMveTtsVoiceId({ ...baseProfile, baseVoiceId: "af_bella" }),
    ).toBe("af_bella");
  });

  it("returns undefined when profile missing or empty voice", () => {
    expect(resolveMveTtsVoiceId(null)).toBeUndefined();
    expect(resolveMveTtsVoiceId({ ...baseProfile })).toBeUndefined();
    expect(
      resolveMveTtsVoiceId({ ...baseProfile, baseVoiceId: "  " }),
    ).toBeUndefined();
  });
});
