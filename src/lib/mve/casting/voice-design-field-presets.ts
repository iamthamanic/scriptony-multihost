/**
 * Curated preset options for Advanced voice design fields (DE label → EN compiler value).
 * Location: src/lib/mve/casting/voice-design-field-presets.ts
 */

import { VOICE_DESIGN_FIELD_PRESETS } from "./voice-design-field-presets-data";

export interface VoiceDesignPreset {
  label: string;
  value: string;
  /** Layperson hint: meaning + film/series/pop-culture examples (DE). */
  hint: string;
}

export type VoiceDesignPresetFieldKey =
  | "nativeLanguage"
  | "nativeDialect"
  | "genderPresentation"
  | "ageRange"
  | "recordingQuality"
  | "personaRole"
  | "personaAttitude"
  | "pitch"
  | "resonance"
  | "weight"
  | "timbre"
  | "texture"
  | "breath"
  | "articulation"
  | "pace"
  | "rhythm"
  | "pauses"
  | "intonation"
  | "emphasis"
  | "energy"
  | "proximity"
  | "avoid";

export const VOICE_DESIGN_CUSTOM_PRESET = "__custom__";

export { VOICE_DESIGN_FIELD_PRESETS };

export function resolvePresetSelectValue(
  value: string,
  presets: VoiceDesignPreset[],
): string {
  const trimmed = value.trim();
  if (!trimmed) return VOICE_DESIGN_CUSTOM_PRESET;
  const match = presets.find((p) => p.value === trimmed);
  return match?.value ?? VOICE_DESIGN_CUSTOM_PRESET;
}
