/**
 * Resolve Kokoro/cloud TTS voice id from an MVE VoiceProfile.
 * Location: src/lib/mve/resolve-tts-voice-id.ts
 */

import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";

/** TTS engine voice id (e.g. Kokoro voice id in baseVoiceId). */
export function resolveMveTtsVoiceId(
  profile: MveVoiceProfile | null | undefined,
  sourceProfile?: MveVoiceProfile | null,
): string | undefined {
  if (!profile) return undefined;
  if (profile.type === "tuned") {
    if (sourceProfile) {
      return resolveMveTtsVoiceId(sourceProfile);
    }
    return undefined;
  }
  const id = profile.baseVoiceId?.trim();
  return id || undefined;
}
