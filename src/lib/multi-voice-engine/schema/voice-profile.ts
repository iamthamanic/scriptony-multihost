/**
 * MVE VoiceProfile schema (PRD §8.4–8.5 MVP).
 * Location: src/lib/multi-voice-engine/schema/voice-profile.ts
 */

import { z } from "zod";
import {
  MveConsentStatusSchema,
  MveEnergySchema,
  MveIdSchema,
  MvePaceSchema,
  MveVoiceProfileStatusSchema,
  MveVoiceProfileTypeSchema,
} from "./enums";

export const MveVoiceAttributesSchema = z.object({
  genderPresentation: z
    .enum(["male", "female", "androgynous", "unknown"])
    .optional(),
  ageImpression: z
    .enum(["child", "young_adult", "adult", "middle_aged", "elderly"])
    .optional(),
  pitch: z.enum(["very_low", "low", "medium", "high", "very_high"]).optional(),
  texture: z
    .enum(["clean", "rough", "breathy", "nasal", "warm", "cold"])
    .optional(),
  pace: MvePaceSchema.optional(),
  energy: MveEnergySchema.optional(),
  accent: z.string().max(120).optional(),
  style: z.string().max(200).optional(),
});
export type MveVoiceAttributes = z.infer<typeof MveVoiceAttributesSchema>;

export const MveVoiceRenderSettingsSchema = z
  .object({
    stability: z.number().min(0).max(1).optional(),
    similarity: z.number().min(0).max(1).optional(),
    speed: z.number().min(0.25).max(4).optional(),
  })
  .strict();
export type MveVoiceRenderSettings = z.infer<
  typeof MveVoiceRenderSettingsSchema
>;

export const MveVoiceProfileSchema = z.object({
  id: MveIdSchema,
  userId: MveIdSchema,
  workspaceId: MveIdSchema.optional(),
  name: z.string().min(1).max(200),
  language: z.string().min(2).max(16).default("de"),
  engine: z.string().min(1).max(64),
  type: MveVoiceProfileTypeSchema.default("default"),
  status: MveVoiceProfileStatusSchema.default("draft"),
  baseVoiceId: MveIdSchema.optional(),
  referenceAudioUrl: z.string().url().optional(),
  description: z.string().max(2000).optional(),
  attributes: MveVoiceAttributesSchema.optional(),
  defaultSettings: MveVoiceRenderSettingsSchema.optional(),
  consentStatus: MveConsentStatusSchema.default("not_required"),
  commercialUseAllowed: z.boolean().default(false),
  /** Linked project character (SQLite character_id) */
  characterId: MveIdSchema.optional(),
  /** Standard sentence for voice preview in Characters panel */
  previewText: z.string().min(1).max(500).optional(),
  version: z.number().int().min(1).default(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MveVoiceProfile = z.output<typeof MveVoiceProfileSchema>;
