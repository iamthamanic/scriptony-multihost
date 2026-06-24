/**
 * MVE Line schema (PRD §8.6 MVP) — timeline-native dialog unit.
 * Location: src/lib/multi-voice-engine/schema/line.ts
 */

import { z } from "zod";
import { MveIdSchema, MveLineStatusSchema, MveLineTypeSchema } from "./enums";
import { MveLineDirectionSchema } from "./line-direction";

export const MveLineSchema = z.object({
  id: MveIdSchema,
  sceneId: MveIdSchema,
  orderIndex: z.number().int().min(0),
  type: MveLineTypeSchema.default("dialogue"),
  characterId: MveIdSchema.optional(),
  text: z.string().max(20_000).optional(),
  direction: MveLineDirectionSchema.optional(),
  selectedTakeId: MveIdSchema.optional(),
  status: MveLineStatusSchema.default("draft"),
  /** Bind to Structure Timeline audio clip when present */
  audioClipId: MveIdSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MveLine = z.output<typeof MveLineSchema>;
