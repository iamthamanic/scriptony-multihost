/**
 * MVE Voice Studio operation input schemas (PRD §11.6, §12.3).
 * Location: src/lib/multi-voice-engine/schema/voice-operations.ts
 */

import { z } from "zod";
import { MveIdSchema } from "./enums";
import {
  MveVoiceAttributesSchema,
  MveVoiceRenderSettingsSchema,
} from "./voice-profile";
import { MveSourceAudioHashSchema } from "./voice-consent";

export const MveGenerateVoiceInputSchema = z.object({
  projectId: MveIdSchema,
  userId: MveIdSchema.optional(),
  characterId: MveIdSchema.optional(),
  name: z.string().min(1).max(200),
  language: z.string().min(2).max(16).default("de"),
  description: z.string().min(1).max(2000),
  attributes: MveVoiceAttributesSchema.optional(),
});
export type MveGenerateVoiceInput = z.output<
  typeof MveGenerateVoiceInputSchema
>;

export const MveCloneVoiceInputSchema = z.object({
  projectId: MveIdSchema,
  userId: MveIdSchema.optional(),
  characterId: MveIdSchema.optional(),
  name: z.string().min(1).max(200),
  language: z.string().min(2).max(16).default("de"),
  referenceAudioUrl: z.string().min(1).max(2048),
  sourceAudioHash: MveSourceAudioHashSchema,
  consentId: MveIdSchema,
  commercialUseAllowed: z.boolean().default(false),
});
export type MveCloneVoiceInput = z.output<typeof MveCloneVoiceInputSchema>;

export const MveTuneVoiceInputSchema = z.object({
  projectId: MveIdSchema,
  userId: MveIdSchema.optional(),
  characterId: MveIdSchema.optional(),
  name: z.string().min(1).max(200),
  language: z.string().min(2).max(16).default("de"),
  baseVoiceId: MveIdSchema,
  attributes: MveVoiceAttributesSchema.optional(),
  defaultSettings: MveVoiceRenderSettingsSchema.optional(),
});
export type MveTuneVoiceInput = z.output<typeof MveTuneVoiceInputSchema>;

export const MveVoiceOperationTypeSchema = z.enum([
  "generate",
  "clone",
  "tune",
]);
export type MveVoiceOperationType = z.output<
  typeof MveVoiceOperationTypeSchema
>;

export const MveVoiceRequestStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);
export type MveVoiceRequestStatus = z.output<
  typeof MveVoiceRequestStatusSchema
>;

export const MveVoiceRequestSchema = z.object({
  id: MveIdSchema,
  projectId: MveIdSchema,
  voiceProfileId: MveIdSchema.optional(),
  operationType: MveVoiceOperationTypeSchema,
  status: MveVoiceRequestStatusSchema.default("pending"),
  inputJson: z.string().min(2),
  errorMessage: z.string().max(2000).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MveVoiceRequest = z.output<typeof MveVoiceRequestSchema>;
