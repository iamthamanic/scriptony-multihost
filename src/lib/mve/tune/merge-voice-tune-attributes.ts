/**
 * Merge base VoiceProfile attributes with tune description and slider overrides.
 * Location: src/lib/mve/tune/merge-voice-tune-attributes.ts
 */

import { extractVoiceAttributesFromDescription } from "@/lib/mve/casting/extract-voice-attributes-from-description";
import type {
  MveVoiceAttributes,
  MveVoiceRenderSettings,
} from "@/lib/multi-voice-engine/schema/voice-profile";

export interface VoiceTuneSliderOverrides {
  pitch?: MveVoiceAttributes["pitch"];
  pace?: MveVoiceAttributes["pace"];
  energy?: MveVoiceAttributes["energy"];
  speed?: number;
}

export function mergeVoiceTuneAttributes(
  baseAttributes: MveVoiceAttributes | undefined,
  tuneDescription: string,
  overrides?: VoiceTuneSliderOverrides,
): MveVoiceAttributes {
  const fromText = tuneDescription.trim()
    ? extractVoiceAttributesFromDescription(tuneDescription)
    : {};

  return {
    ...baseAttributes,
    ...fromText,
    ...(overrides?.pitch ? { pitch: overrides.pitch } : {}),
    ...(overrides?.pace ? { pace: overrides.pace } : {}),
    ...(overrides?.energy ? { energy: overrides.energy } : {}),
  };
}

export function mergeVoiceTuneRenderSettings(
  baseSettings: MveVoiceRenderSettings | undefined,
  overrides?: VoiceTuneSliderOverrides,
): MveVoiceRenderSettings | undefined {
  const speed = overrides?.speed ?? baseSettings?.speed;
  if (speed === undefined && !baseSettings) return undefined;
  return {
    ...baseSettings,
    ...(speed !== undefined ? { speed } : {}),
  };
}
