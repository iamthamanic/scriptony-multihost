/**
 * Voicebox preset engine ids (shared by API client and provider dropdown).
 * Location: src/lib/config/voicebox-preset-engines.ts
 */

export const VOICEBOX_PRESET_ENGINES = [
  "qwen_custom_voice",
  "kokoro",
  "luxtts",
  "chatterbox",
  "chatterbox_turbo",
  "tada",
] as const;

export type VoiceboxPresetEngine = (typeof VOICEBOX_PRESET_ENGINES)[number];

export const KOKORO_PRESET_ENGINE: VoiceboxPresetEngine = "kokoro";

/** Presets under Eigene Stimmen were split out — kept for legacy combined loader. */
export const VOICEBOX_PROVIDER_PRESET_ENGINES = [
  "qwen_custom_voice",
  "luxtts",
  "chatterbox",
  "chatterbox_turbo",
  "tada",
] as const satisfies readonly VoiceboxPresetEngine[];

export function voiceboxPresetEngineLabel(engine: string): string {
  if (engine === "kokoro") return "Kokoro";
  if (engine === "qwen_custom_voice") return "Qwen";
  if (engine === "qwen") return "Qwen Base";
  if (engine === "luxtts") return "LuxTTS";
  if (engine === "chatterbox") return "Chatterbox";
  if (engine === "chatterbox_turbo") return "Chatterbox Turbo";
  if (engine === "tada") return "TADA";
  return engine;
}
