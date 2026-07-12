/**
 * MVE Lane Link schema — default scene/shot target for a character dialog lane.
 *
 * A lane link is a per-project, per-character hint that tells the Text-First
 * Audio Workflow where new text blocks (and later derived audio) should be
 * placed by default. It does not own the text blocks; deleting the target
 * container does not cascade-delete the link.
 *
 * Location: src/lib/multi-voice-engine/schema/lane-link.ts
 */

import { z } from "zod";
import { MveIdSchema } from "./enums";

export const MveLaneLinkTargetContainerTypeSchema = z.enum(["scene", "shot"]);
export type MveLaneLinkTargetContainerType = z.output<
  typeof MveLaneLinkTargetContainerTypeSchema
>;

export const MveLaneLinkSchema = z.object({
  id: MveIdSchema,
  projectId: MveIdSchema,
  characterId: MveIdSchema,
  /** Primary target container (scene for audio/book, shot for film). */
  targetContainerId: MveIdSchema,
  /** Container type referenced by targetContainerId. */
  targetContainerType: MveLaneLinkTargetContainerTypeSchema,
  /** Whether the link is active (shown in UI, used for defaults). */
  enabled: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type MveLaneLink = z.output<typeof MveLaneLinkSchema>;
