/**
 * MVE Take schema (PRD §8.8).
 * Location: src/lib/multi-voice-engine/schema/take.ts
 */

import { z } from "zod";
import { MveIdSchema, MveTakeStatusSchema } from "./enums";
import { MveLineDirectionSchema } from "./line-direction";
import { VoiceRenderSettingsSchema } from "./render-line";

export const MveTakeSchema = z.object({
  id: MveIdSchema,
  lineId: MveIdSchema,
  jobId: MveIdSchema,
  takeIndex: z.number().int().min(0).max(10),
  audioUrl: z.string().min(1).optional(),
  durationMs: z.number().int().min(0).optional(),
  renderSettings: VoiceRenderSettingsSchema.optional(),
  directionSnapshot: MveLineDirectionSchema.optional(),
  isSelected: z.boolean().default(false),
  status: MveTakeStatusSchema.default("processing"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MveTake = z.infer<typeof MveTakeSchema>;
