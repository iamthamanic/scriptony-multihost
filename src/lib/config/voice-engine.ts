/**
 * Default local TTS engine for desktop (MVE + legacy scene TTS).
 * Location: src/lib/config/voice-engine.ts
 */

export type LocalVoiceEngineId = "voicebox" | "kokoro";

const envEngine = import.meta.env.VITE_DEFAULT_VOICE_ENGINE?.trim();

/** Active local TTS engine — default Voicebox when Voicebox app is running. */
export const DEFAULT_VOICE_ENGINE: LocalVoiceEngineId =
  envEngine === "kokoro" ? "kokoro" : "voicebox";

export const VOICEBOX_BASE_URL =
  import.meta.env.VITE_VOICEBOX_BASE_URL?.trim() || "http://127.0.0.1:17493";

export function isVoiceboxDefault(): boolean {
  return DEFAULT_VOICE_ENGINE === "voicebox";
}

export function localVoiceEngineLabel(engine: LocalVoiceEngineId): string {
  return engine === "voicebox" ? "Voicebox" : "Kokoro";
}
