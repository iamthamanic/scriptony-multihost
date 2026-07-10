/**
 * Minimal VoiceProfile for preview/render paths (engine-aware).
 * Location: src/lib/mve/minimal-voice-profile.ts
 */

import {
  DEFAULT_VOICE_ENGINE,
  type LocalVoiceEngineId,
} from "@/lib/config/voice-engine";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";

export function minimalVoiceProfile(
  voiceId: string,
  engine: LocalVoiceEngineId = DEFAULT_VOICE_ENGINE,
  speed?: number,
): MveVoiceProfile {
  const now = new Date().toISOString();
  return {
    id: "mve_preview_voice",
    userId: "local-user",
    name: "Preview",
    language: "de",
    engine,
    type: "default",
    status: "ready",
    baseVoiceId: voiceId,
    consentStatus: "not_required",
    commercialUseAllowed: false,
    version: 1,
    createdAt: now,
    updatedAt: now,
    defaultSettings: speed != null ? { speed } : undefined,
  };
}

/** @deprecated Use minimalVoiceProfile(..., "kokoro") */
export function minimalKokoroVoiceProfile(
  voiceId: string,
  speed?: number,
): MveVoiceProfile {
  return minimalVoiceProfile(voiceId, "kokoro", speed);
}
