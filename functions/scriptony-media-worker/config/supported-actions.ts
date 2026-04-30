/**
 * T15 Supported Media Actions Registry.
 * Neue Actions nur mit Eintrag + Worker-Support.
 *
 * SOLID/OCP: Neue Actions via Registry-Eintrag hinzufuegbar,
 * ohne Dispatcher-Code zu aendern.
 */

import { z } from "zod";
import { ProjectIdSchema } from "../../_shared/validation";

/** Shared action name validator (DRY). */
export const MediaActionName = z.string().min(1).max(64);

const BasePayload = z.object({
  project_id: ProjectIdSchema,
});

/** Action config — payload schema is a Zod object, inferred via satisfies. */
export interface MediaActionConfig {
  jobType: string;
  description: string;
  maxPayloadBytes: number;
  payloadSchema: z.ZodObject<z.ZodRawShape>;
}

/** Registry — each entry keeps its own Zod-inferred payload type. */
export const SUPPORTED_MEDIA_ACTIONS = {
  "mix-audio": {
    jobType: "media-worker-mix-audio",
    description: "Mix audio tracks into final output",
    maxPayloadBytes: 50_000,
    payloadSchema: BasePayload.extend({
      session_id: z.string().min(1, "session_id required"),
    }),
  },
  "export-audio-production": {
    jobType: "media-worker-export-audio-production",
    description: "Export audio production to file",
    maxPayloadBytes: 50_000,
    payloadSchema: BasePayload.extend({
      session_id: z.string().min(1, "session_id required"),
      format: z.string().min(1, "format required"),
    }),
  },
  "render-video": {
    jobType: "media-worker-render-video",
    description: "Render video from stage/shots",
    maxPayloadBytes: 50_000,
    payloadSchema: BasePayload.extend({}),
  },
  "execute-image-render": {
    jobType: "media-worker-execute-image-render",
    description: "Execute pending image render job",
    maxPayloadBytes: 50_000,
    payloadSchema: BasePayload.extend({
      render_id: z.string().min(1, "render_id required"),
    }),
  },
  "extract-palette": {
    jobType: "media-worker-extract-palette",
    description: "Extract color palette from images",
    maxPayloadBytes: 30_000,
    payloadSchema: BasePayload.extend({
      image_ids: z
        .array(z.string().min(1))
        .min(1, "image_ids must be a non-empty array"),
    }),
  },
  "export-style-guide": {
    jobType: "media-worker-export-style-guide",
    description: "Export style guide to document",
    maxPayloadBytes: 30_000,
    payloadSchema: BasePayload.extend({}),
  },
  "normalize-audio": {
    jobType: "media-worker-normalize-audio",
    description: "Normalize audio file loudness",
    maxPayloadBytes: 30_000,
    payloadSchema: BasePayload.extend({
      asset_id: z.string().min(1, "asset_id required"),
    }),
  },
  "convert-file": {
    jobType: "media-worker-convert-file",
    description: "Convert media file to different format",
    maxPayloadBytes: 30_000,
    payloadSchema: BasePayload.extend({
      asset_id: z.string().min(1, "asset_id required"),
      target_format: z.string().min(1, "target_format required"),
    }),
  },
} satisfies Record<string, MediaActionConfig>;

/** Inferred type for consumers that need the union of all payloads. */
export type SupportedMediaActions = typeof SUPPORTED_MEDIA_ACTIONS;
