/**
 * MVE LineDirection schema (PRD §8.7).
 * Location: src/lib/multi-voice-engine/schema/line-direction.ts
 */

import { z } from "zod";
import {
  MveEmotionSchema,
  MveEmphasisSchema,
  MveEnergySchema,
  MveIdSchema,
  MvePaceSchema,
  MveVolumeSchema,
} from "./enums";

export const MvePronunciationHintSchema = z.object({
  text: z.string().min(1).max(200),
  speakAs: z.string().max(200).optional(),
});
export type MvePronunciationHint = z.infer<typeof MvePronunciationHintSchema>;

export const MveLineDirectionSchema = z.object({
  emotion: MveEmotionSchema.optional(),
  pace: MvePaceSchema.optional(),
  volume: MveVolumeSchema.optional(),
  energy: MveEnergySchema.optional(),
  emphasis: MveEmphasisSchema.optional(),
  pauseBeforeMs: z.number().int().min(0).max(60_000).optional(),
  pauseAfterMs: z.number().int().min(0).max(60_000).optional(),
  directorNote: z.string().max(2000).optional(),
  pronunciationHints: z.array(MvePronunciationHintSchema).max(32).optional(),
  performanceReferenceId: MveIdSchema.optional(),
});
export type MveLineDirection = z.infer<typeof MveLineDirectionSchema>;
