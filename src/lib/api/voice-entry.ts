/**
 * Shared voice list entry shape (Voicebox profiles, presets, ElevenLabs).
 * Location: src/lib/api/voice-entry.ts
 */

export interface VoiceEntry {
  id: string;
  name: string;
  lang: string;
  gender: string;
  /** Voicebox preset engine (e.g. kokoro, qwen_custom_voice) */
  presetEngine?: string;
  /** True when id is a Voicebox preset, not a persisted profile */
  isPreset?: boolean;
}

export interface LocalTtsPayload {
  text: string;
  voice: string;
  speed?: number;
  format?: "wav" | "mp3";
}
