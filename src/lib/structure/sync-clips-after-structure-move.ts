/**
 * Shift audio/MVE dialog clips when structure move/reparent changes scene startSec.
 * Location: src/lib/structure/sync-clips-after-structure-move.ts
 */

import type { RippleClip, RippleOutput } from "../ripple-engine-types";
import type { TimelineTree } from "../timeline-tree/types";
import type { AudioClip } from "../types";
import { buildRippleContainersFromTree } from "./ripple-containers-from-tree";
import { clipRippleFromSceneStartShifts } from "./resize-scene-for-content";

export function computeStructureMoveClipRipple(
  before: TimelineTree,
  next: TimelineTree,
  clips: AudioClip[],
): RippleOutput {
  const beforeScenes = buildRippleContainersFromTree(before).scenes;
  const afterScenes = buildRippleContainersFromTree(next).scenes;
  const rippleClips: RippleClip[] = clips.map((clip) => ({
    id: clip.id,
    sceneId: clip.sceneId,
    startSec: clip.startSec,
    endSec: clip.endSec,
    crossScene: Boolean(clip.crossScene),
  }));
  return clipRippleFromSceneStartShifts(beforeScenes, afterScenes, rippleClips);
}
