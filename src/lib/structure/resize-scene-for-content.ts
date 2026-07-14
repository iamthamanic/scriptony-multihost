/**
 * Resize scene (grow/shrink) to fit MVE/audio content end time.
 * Generalizes extend-scene-for-audio (T29) for content-driven audio projects.
 *
 * Location: src/lib/structure/resize-scene-for-content.ts
 */

import type { TimelineData } from "@/lib/timeline-data";
import { loadProjectTimelineBundleForRuntime } from "../api-adapter/timeline-bundle";
import { localGetProjectAudioClips } from "../api-adapter/clips-local";
import { calculateRipple } from "../ripple-engine";
import type {
  RippleClip,
  RippleOutput,
  RippleScene,
} from "../ripple-engine-types";
import { resizeStructureItem } from "../ripple-engine/hierarchical";
import {
  buildTimelineTree,
  resolveProjectDurationSecForBuild,
} from "../timeline-tree/buildTree";
import { diffTreeToPatches } from "../timeline-tree/diff";
import {
  DEFAULT_FRAME_RATE,
  DEFAULT_MIN_ITEM_DURATION_FRAMES,
  frameToSec,
  secToFrame,
} from "../timeline-tree/types";
import { buildRippleContainersFromTree } from "./ripple-containers-from-tree";
import { persistAudioRippleWithRollback } from "./persist-audio-ripple-local";

const DEFAULT_PROJECT_DURATION_SEC = 300;
const FRAME_EPS_SEC = 0.5 / DEFAULT_FRAME_RATE;

export interface ResizeSceneForContentInput {
  projectId: string;
  sceneId: string;
  requiredEndSec: number;
  /** When set, uses clip ripple (grow/shrink with changed clip end). */
  clipId?: string;
}

export interface ResizeSceneForContentResult {
  deltaSec: number;
  resized: boolean;
  blocked?: boolean;
  blockReason?: string;
  requiredEndSec?: number;
  sceneEndSec?: number;
}

export function computeSceneResizeDelta(
  currentSceneEndSec: number,
  requiredEndSec: number,
): number {
  return requiredEndSec - currentSceneEndSec;
}

/** Changed clip end for scene-grow ripple (must not cap to old scene end). */
export function rippleClipsForSceneGrow(
  clipId: string,
  requiredEndSec: number,
  allClips: RippleClip[],
): RippleClip[] {
  return allClips.map((c) =>
    c.id === clipId ? { ...c, endSec: requiredEndSec } : c,
  );
}

function resolveBaseProjectDurationSec(timelineData: TimelineData): number {
  const layout = timelineData.layoutProjectDurationSec;
  if (typeof layout === "number" && layout > 0) return layout;
  return DEFAULT_PROJECT_DURATION_SEC;
}

/** Shift clips when scene startSec moves (text-only structure ripple). */
export function clipRippleFromSceneStartShifts(
  beforeScenes: RippleScene[],
  afterScenes: RippleScene[],
  allClips: RippleClip[],
): RippleOutput {
  const startDeltaByScene = new Map<string, number>();
  for (const after of afterScenes) {
    const before = beforeScenes.find((s) => s.id === after.id);
    if (!before) continue;
    const delta = after.startSec - before.startSec;
    if (Math.abs(delta) > 1e-9) {
      startDeltaByScene.set(after.id, delta);
    }
  }

  let affected = 0;
  const updatedClips = allClips.map((clip) => {
    const delta = startDeltaByScene.get(clip.sceneId);
    if (delta == null || clip.crossScene) return { ...clip };
    affected += 1;
    return {
      ...clip,
      startSec: clip.startSec + delta,
      endSec: clip.endSec + delta,
    };
  });

  return {
    updatedClips,
    updatedScenes: afterScenes.map((s) => ({ ...s })),
    updatedSequences: [],
    updatedActs: [],
    stats: {
      affectedClips: affected,
      affectedScenes: startDeltaByScene.size,
      affectedSequences: 0,
      affectedActs: 0,
      deltaSec: 0,
    },
  };
}

export async function resizeSceneForContent(
  input: ResizeSceneForContentInput,
): Promise<ResizeSceneForContentResult> {
  const { projectId, sceneId, requiredEndSec, clipId } = input;

  const timelineData = (await loadProjectTimelineBundleForRuntime(
    projectId,
    "",
    false,
  )) as TimelineData;

  const projectDurationSec = resolveProjectDurationSecForBuild({
    timelineData,
    projectDurationSec: resolveBaseProjectDurationSec(timelineData),
    frameRate: DEFAULT_FRAME_RATE,
  });

  const tree = buildTimelineTree({
    timelineData,
    projectDurationSec,
    frameRate: DEFAULT_FRAME_RATE,
  });

  const sceneItem = tree.items.get(sceneId);
  if (!sceneItem || sceneItem.kind !== "scene") {
    console.warn("[resizeSceneForContent] scene not found:", sceneId);
    return {
      deltaSec: 0,
      resized: false,
      blocked: true,
      blockReason: "scene_not_found",
    };
  }

  const sceneEndSec = frameToSec(sceneItem.endFrame, tree.frameRate);
  const requiredEndFrame = secToFrame(requiredEndSec, tree.frameRate);
  const targetEndSec = frameToSec(requiredEndFrame, tree.frameRate);
  const deltaSec = computeSceneResizeDelta(sceneEndSec, targetEndSec);

  if (Math.abs(deltaSec) < FRAME_EPS_SEC) {
    return {
      deltaSec: 0,
      resized: false,
      requiredEndSec: targetEndSec,
      sceneEndSec,
    };
  }

  const structureResult = resizeStructureItem({
    tree,
    itemId: sceneId,
    side: "right",
    newBoundaryFrame: requiredEndFrame,
    operation: "ripple-resize",
    minItemDurationFrames: DEFAULT_MIN_ITEM_DURATION_FRAMES,
  });

  if (structureResult.blocked) {
    console.warn(
      "[resizeSceneForContent] structure ripple blocked:",
      structureResult.blockReason,
    );
    return {
      deltaSec: 0,
      resized: false,
      blocked: true,
      blockReason: structureResult.blockReason,
      requiredEndSec: targetEndSec,
      sceneEndSec,
    };
  }

  const patches = diffTreeToPatches(
    structureResult.before,
    structureResult.next,
  );

  const clips = await localGetProjectAudioClips(projectId);
  const containersBefore = buildRippleContainersFromTree(
    structureResult.before,
  );
  const containersAfter = buildRippleContainersFromTree(structureResult.next);

  const rippleClips: RippleClip[] = clips.map((c) => ({
    id: c.id,
    sceneId: c.sceneId,
    startSec: c.startSec,
    endSec: c.endSec,
    crossScene: Boolean(c.crossScene),
  }));

  let clipRipple: RippleOutput;

  if (clipId) {
    clipRipple = calculateRipple({
      changedClipId: clipId,
      newEndSec: requiredEndSec,
      allClips: rippleClipsForSceneGrow(clipId, requiredEndSec, rippleClips),
      allScenes: containersBefore.scenes,
      allSequences: containersBefore.sequences,
      allActs: containersBefore.acts,
    });
  } else {
    clipRipple = clipRippleFromSceneStartShifts(
      containersBefore.scenes,
      containersAfter.scenes,
      rippleClips,
    );
  }

  if (patches.length === 0) {
    return {
      deltaSec: 0,
      resized: false,
      requiredEndSec: targetEndSec,
      sceneEndSec,
    };
  }

  await persistAudioRippleWithRollback(patches, clips, clipRipple);

  return {
    deltaSec,
    resized: true,
    requiredEndSec: targetEndSec,
    sceneEndSec,
  };
}
