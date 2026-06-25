/**
 * MVE AudioJob schema (PRD §12.6 MVP).
 * Location: src/lib/multi-voice-engine/schema/audio-job.ts
 */

import { z } from "zod";
import { MveAudioJobStatusSchema, MveIdSchema } from "./enums";
import { MveLineDirectionSchema } from "./line-direction";
import { MveLineSchema } from "./line";
import { MveVoiceProfileSchema } from "./voice-profile";

/** Frozen script state for render — PRD §25.2 */
export const MveLineRenderSnapshotSchema = z.object({
  line: MveLineSchema,
  voice: MveVoiceProfileSchema,
  direction: MveLineDirectionSchema.optional(),
});
export type MveLineRenderSnapshot = z.infer<typeof MveLineRenderSnapshotSchema>;

export const MveAudioJobSchema = z.object({
  id: MveIdSchema,
  projectId: MveIdSchema,
  lineId: MveIdSchema,
  status: MveAudioJobStatusSchema.default("pending"),
  engine: z.string().min(1).max(64),
  takeCount: z.number().int().min(1).max(5).default(1),
  scriptSnapshot: MveLineRenderSnapshotSchema,
  errorMessage: z.string().max(2000).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MveAudioJob = z.infer<typeof MveAudioJobSchema>;
