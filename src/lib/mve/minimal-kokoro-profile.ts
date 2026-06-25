/**
 * Build minimal Kokoro VoiceProfile for preview/render paths.
 * Location: src/lib/mve/minimal-kokoro-profile.ts
 */

import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";

export function minimalKokoroVoiceProfile(
  voiceId: string,
  speed?: number,
): MveVoiceProfile {
  const now = new Date().toISOString();
  return {
    id: "mve_preview_voice",
    userId: "local-user",
    name: "Preview",
    language: "de",
    engine: "kokoro",
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
