/**
 * AudioClip API Client — facade → clips-adapter (local vs cloud).
 */

import type { RippleAct, RippleScene, RippleSequence } from "../ripple-engine";
import type { AudioClip } from "../types";

/** Fields clients may send on PUT /clips/:id (matches backend sanitizeClipInput). */
export type AudioClipUpdatePayload = Partial<
  Pick<
    AudioClip,
    | "laneIndex"
    | "sceneId"
    | "fxPresetId"
    | "startSec"
    | "endSec"
    | "orderIndex"
    | "characterId"
    | "fxSlots"
    | "fxChainEnabled"
    | "audioFileId"
  >
>;

export interface RipplePayload {
  changedClipId: string;
  newEndSec: number;
  allClips: AudioClip[];
  allScenes: RippleScene[];
  allSequences: RippleSequence[];
  allActs: RippleAct[];
}

export interface RippleResult {
  stats: {
    affectedClips: number;
    affectedScenes: number;
    affectedSequences: number;
    affectedActs: number;
    deltaSec: number;
  };
  updatedClips: number;
  scenes?: Array<Record<string, unknown>>;
  sequences?: Array<Record<string, unknown>>;
  acts?: Array<Record<string, unknown>>;
  errors?: string[];
  warning?: string;
}

export {
  getProjectAudioClips,
  getClipsByScene,
  createClip,
  updateClip,
  rippleClips,
  deleteClip,
} from "@/lib/api-adapter/clips-adapter";
