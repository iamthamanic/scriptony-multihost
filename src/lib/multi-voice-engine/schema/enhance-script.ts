/**
 * MVE Enhance Script — request/response DTOs (PRD §6.6, §22.2).
 * Location: src/lib/multi-voice-engine/schema/enhance-script.ts
 */

import { z } from "zod";
import { MveCharacterRoleTypeSchema, MveLineTypeSchema } from "./enums";
import { MveLineDirectionSchema } from "./line-direction";

export const MveEnhanceScriptRequestSchema = z.object({
  projectId: z.string().min(1).max(128),
  sceneId: z.string().min(1).max(128).optional(),
  rawText: z.string().min(1).max(50_000),
  existingCharacterNames: z.array(z.string().max(200)).max(200).optional(),
  uiLanguage: z.enum(["de", "en"]).optional(),
});
export type MveEnhanceScriptRequest = z.output<
  typeof MveEnhanceScriptRequestSchema
>;

export const MveEnhanceCharacterDraftSchema = z.object({
  tempId: z.string().min(1).max(64),
  name: z.string().min(1).max(200),
  roleType: MveCharacterRoleTypeSchema.default("character"),
  description: z.string().max(5000).optional(),
});
export type MveEnhanceCharacterDraft = z.output<
  typeof MveEnhanceCharacterDraftSchema
>;

export const MveEnhanceLineDraftSchema = z.object({
  orderIndex: z.number().int().min(0),
  type: MveLineTypeSchema.default("dialogue"),
  characterTempId: z.string().max(64).optional(),
  text: z.string().min(1).max(20_000),
  direction: MveLineDirectionSchema.optional(),
});
export type MveEnhanceLineDraft = z.output<typeof MveEnhanceLineDraftSchema>;

export const MveEnhanceScriptResultSchema = z.object({
  characters: z.array(MveEnhanceCharacterDraftSchema).max(100),
  lines: z.array(MveEnhanceLineDraftSchema).max(500),
  warnings: z.array(z.string().max(500)).max(20).optional(),
});
export type MveEnhanceScriptResult = z.output<
  typeof MveEnhanceScriptResultSchema
>;
