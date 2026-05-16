/**
 * Zod schemas for audio clip HTTP routes and ripple payload validation.
 */

import { z } from "zod";

export const TemporalItemSchema = z
  .object({
    id: z.string().min(1),
    startSec: z.number().optional(),
    start_sec: z.number().optional(),
    endSec: z.number().optional(),
    end_sec: z.number().optional(),
    start: z.number().optional(),
    end: z.number().optional(),
    orderIndex: z.number().optional(),
    order_index: z.number().optional(),
  })
  .passthrough();

export const RippleSceneSchema = TemporalItemSchema.extend({
  sequenceId: z.string().nullable().optional(),
  sequence_id: z.string().nullable().optional(),
});

export const RippleSequenceSchema = TemporalItemSchema.extend({
  actId: z.string().nullable().optional(),
  act_id: z.string().nullable().optional(),
});

export const RippleActSchema = TemporalItemSchema;

export const RippleClipSchema = z
  .object({
    id: z.string().min(1),
    sceneId: z.string().min(1).optional(),
    scene_id: z.string().min(1).optional(),
    startSec: z.number().optional(),
    start_sec: z.number().optional(),
    endSec: z.number().optional(),
    end_sec: z.number().optional(),
    crossScene: z.boolean().optional(),
    cross_scene: z.boolean().optional(),
  })
  .passthrough()
  .refine((val) => Boolean(val.sceneId?.trim() || val.scene_id?.trim()), {
    message: "sceneId or scene_id is required",
  });

export const RippleInputSchema = z.object({
  changedClipId: z.string().min(1),
  newEndSec: z.number().min(0),
  allClips: z.array(RippleClipSchema).min(1),
  allScenes: z.array(RippleSceneSchema).min(1),
  allSequences: z.array(RippleSequenceSchema),
  allActs: z.array(RippleActSchema),
});

/** PUT /scenes/reorder — optional ripple context for temporal repack. */
export const SceneReorderInputSchema = z.object({
  sceneIds: z.array(z.string().min(1)).min(1),
  allClips: z.array(RippleClipSchema).optional(),
  allScenes: z.array(RippleSceneSchema).optional(),
  allSequences: z.array(RippleSequenceSchema).optional(),
  allActs: z.array(RippleActSchema).optional(),
});

export const ClipInputSchema = z.object({
  track_id: z.string().min(1),
  scene_id: z.string().min(1),
  project_id: z.string().min(1),
  start_sec: z.number().min(0).default(0),
  end_sec: z.number().min(0).default(1),
  lane_index: z.number().int().min(0).max(99).default(0),
  order_index: z.number().int().min(0).default(0),
  audio_file_id: z.string().min(1).optional(),
  waveform_data: z
    .union([z.array(z.number().min(0).max(1)).max(200), z.string()])
    .optional(),
  cross_scene: z.boolean().default(false),
  fx_preset_id: z.string().min(1).optional(),
  track_type: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  character_id: z.string().min(1).optional(),
});
