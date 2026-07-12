/**
 * Film timeline types (editorial clips and shots).
 */

import type { Character } from "./project";
import type { ShotAudio } from "./audio";

/**
 * Editorial timeline segment (NLE). Persisted in Appwrite `clips`.
 * Global times on the project timeline (0 .. project duration).
 * Phase 1: single lane (`laneIndex` always 0 in UI).
 */
export interface Clip {
  id: string;
  projectId: string;
  shotId: string;
  sceneId: string;
  startSec: number;
  endSec: number;
  laneIndex: number;
  orderIndex: number;
  sourceInSec?: number;
  sourceOutSec?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Shot {
  id: string;
  sceneId: string;
  /** Denormalized when API / UI needs project scope. */
  projectId?: string;
  shotNumber: string; // e.g. "1A", "2", "3B"
  description?: string;
  // Camera
  cameraAngle?: string; // 'Eye Level', 'High Angle', 'Low Angle', 'Bird\'s Eye View', etc.
  cameraMovement?: string; // 'Static', 'Pan', 'Tilt', 'Dolly In/Out', 'Handheld', etc.
  framing?: string; // 'ECU', 'CU', 'MCU', 'MS', 'WS', 'EWS', etc.
  lens?: string; // '14mm', '24mm', '35mm', '50mm', '85mm', '100mm', etc.
  // Timing — planning only (coverage / intent). Editorial duration lives on `Clip` rows.
  duration?: string; // Legacy '3s', '0:05'
  /** Planned shot length (minutes) — not the same as sum of clip durations. */
  shotlengthMinutes?: number;
  /** Planned shot length (seconds component) — not editorial geometry. */
  shotlengthSeconds?: number;
  /** Legacy snake_case from API responses. */
  shotlength_minutes?: number;
  shotlength_seconds?: number;
  scene_id?: string;
  // Visual
  composition?: string;
  lightingNotes?: string;
  imageUrl?: string; // Shot preview image
  /** Appwrite Storage file ID for Stage2D JSON (`stage-schema-info` document) */
  stage2dFileId?: string;
  stage2d_file_id?: string;
  /** Appwrite Storage file ID for Stage3D document */
  stage3dFileId?: string;
  stage3d_file_id?: string;
  /** Set when image was uploaded (e.g. image/png, image/jpeg) for UI badge */
  shotImageMime?: string;
  shot_image_mime?: string;
  // Audio
  soundNotes?: string;
  // Production
  storyboardUrl?: string;
  referenceImageUrl?: string;
  // Content
  dialog?: string; // Dialog text with @-mentions
  notes?: string; // Production notes
  // Ordering
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  /** Legacy snake_case from API. */
  updated_at?: string;
  updatedBy?: string; // User ID who last updated (TODO: Backend support needed)
  // Relations (populated by server)
  characters?: Character[];
  audioFiles?: ShotAudio[];
  /** TipTap JSON or extra shot payload from API / screenplay views. */
  metadata?: Record<string, unknown>;
  // Puppet-Layer revision counters (set by Bridge / Blender Addon)
  blenderSyncRevision?: number;
  guideBundleRevision?: number;
  styleProfileRevision?: number;
  renderRevision?: number;
  lastBlenderSyncAt?: string | null;
  lastPreviewAt?: string | null;
  /** ID of the accepted render job (set by accept) */
  acceptedRenderJobId?: string | null;
  /** ID of the most recent render job (set by create/reject) */
  latestRenderJobId?: string | null;
}
