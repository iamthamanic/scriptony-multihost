/**
 * Structured voice design spec (Identity layer) for Advanced tab + compiler.
 * Location: src/lib/multi-voice-engine/schema/voice-design-spec.ts
 */

import { z } from "zod";

export const MveVoiceDesignSpecSchema = z.object({
  native: z
    .object({
      language: z.string().max(80).optional(),
      dialect: z.string().max(120).optional(),
    })
    .optional(),
  presentation: z
    .object({
      genderPresentation: z.string().max(80).optional(),
      ageRange: z.string().max(80).optional(),
      recordingQuality: z.string().max(120).optional(),
    })
    .optional(),
  persona: z
    .object({
      role: z.string().max(200).optional(),
      attitude: z.array(z.string().max(80)).max(6).optional(),
    })
    .optional(),
  voiceIdentity: z
    .object({
      pitch: z.string().max(120).optional(),
      resonance: z.string().max(120).optional(),
      weight: z.string().max(120).optional(),
      timbre: z.string().max(200).optional(),
      texture: z.string().max(120).optional(),
      breath: z.string().max(120).optional(),
      articulation: z.string().max(120).optional(),
    })
    .optional(),
  delivery: z
    .object({
      pace: z.string().max(120).optional(),
      rhythm: z.string().max(120).optional(),
      pauses: z.string().max(120).optional(),
      intonation: z.string().max(120).optional(),
      emphasis: z.string().max(120).optional(),
      energy: z.string().max(120).optional(),
      proximity: z.string().max(120).optional(),
    })
    .optional(),
  avoid: z.array(z.string().max(120)).max(12).optional(),
  technical: z
    .object({
      seed: z.number().int().min(0).optional(),
      guidance: z.number().min(0).max(1).optional(),
      temperature: z.number().min(0).max(2).optional(),
      variationStrength: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

export type MveVoiceDesignSpec = z.infer<typeof MveVoiceDesignSpecSchema>;

export function emptyVoiceDesignSpec(): MveVoiceDesignSpec {
  return {
    native: {},
    presentation: {},
    persona: { attitude: [] },
    voiceIdentity: {},
    delivery: {},
    avoid: [],
    technical: {},
  };
}

export function isVoiceDesignSpecEmpty(
  spec: MveVoiceDesignSpec | null | undefined,
): boolean {
  if (!spec) return true;
  const json = JSON.stringify(spec);
  return json === JSON.stringify(emptyVoiceDesignSpec());
}
