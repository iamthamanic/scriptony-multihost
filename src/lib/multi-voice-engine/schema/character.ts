/**
 * MVE Character schema (PRD §8.3 MVP).
 * Location: src/lib/multi-voice-engine/schema/character.ts
 */

import { z } from "zod";
import { MveCharacterRoleTypeSchema, MveIdSchema } from "./enums";
import { MveLineDirectionSchema } from "./line-direction";

export const MveCharacterSchema = z.object({
  id: MveIdSchema,
  projectId: MveIdSchema,
  name: z.string().min(1).max(200),
  roleType: MveCharacterRoleTypeSchema.default("character"),
  description: z.string().max(5000).optional(),
  voiceId: MveIdSchema.optional(),
  defaultDirection: MveLineDirectionSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MveCharacter = z.output<typeof MveCharacterSchema>;
