/**
 * Resolve Kokoro/cloud TTS voice id from an MVE VoiceProfile.
 * Location: src/lib/mve/resolve-tts-voice-id.ts
 */

import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";

/** TTS engine voice id (e.g. Kokoro voice id in baseVoiceId). */
export function resolveMveTtsVoiceId(
  profile: MveVoiceProfile | null | undefined,
): string | undefined {
  const id = profile?.baseVoiceId?.trim();
  return id || undefined;
}
