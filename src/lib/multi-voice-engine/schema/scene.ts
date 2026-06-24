/**
 * MVE Scene schema (PRD §8.2 MVP).
 * Location: src/lib/multi-voice-engine/schema/scene.ts
 */

import { z } from "zod";
import { MveIdSchema, MveSceneStatusSchema } from "./enums";

export const MveSceneSchema = z.object({
  id: MveIdSchema,
  projectId: MveIdSchema,
  orderIndex: z.number().int().min(0),
  title: z.string().min(1).max(500),
  location: z.string().max(500).optional(),
  timeOfDay: z.string().max(120).optional(),
  mood: z.string().max(200).optional(),
  description: z.string().max(10_000).optional(),
  status: MveSceneStatusSchema.default("draft"),
  /** Optional link to structure timeline scene node */
  timelineSceneId: z.string().max(128).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MveScene = z.output<typeof MveSceneSchema>;
