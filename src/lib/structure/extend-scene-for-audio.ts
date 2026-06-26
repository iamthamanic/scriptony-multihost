/**
 * Extend a scene (and parents / following scenes) when audio exceeds scene length (T29).
 * Uses hierarchical structure ripple + clip ripple for local desktop projects.
 *
 * Location: src/lib/structure/extend-scene-for-audio.ts
 */

import type { TimelineData } from "@/lib/timeline-data";
import { loadProjectTimelineBundleForRuntime } from "../api-adapter/timeline-bundle";
import { localGetProjectAudioClips } from "../api-adapter/clips-local";
import { calculateRipple } from "../ripple-engine";
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

export interface ExtendSceneForAudioInput {
  projectId: string;
  sceneId: string;
  clipId: string;
  clipEndSec: number;
}

export interface ExtendSceneForAudioResult {
  deltaSec: number;
  extended: boolean;
}

/** Pure: seconds the scene must grow to fit requiredEndSec (0 if already fits). */
export function computeSceneExtendDelta(
  currentSceneEndSec: number,
  requiredEndSec: number,
): number {
  return Math.max(0, requiredEndSec - currentSceneEndSec);
}

function resolveBaseProjectDurationSec(timelineData: TimelineData): number {
  const layout = timelineData.layoutProjectDurationSec;
  if (typeof layout === "number" && layout > 0) return layout;
  return DEFAULT_PROJECT_DURATION_SEC;
}

export async function extendSceneForAudio(
  input: ExtendSceneForAudioInput,
): Promise<ExtendSceneForAudioResult> {
  const { projectId, sceneId, clipId, clipEndSec } = input;

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
    console.warn("[extendSceneForAudio] scene not found in tree:", sceneId);
    return { deltaSec: 0, extended: false };
  }

  const sceneEndSec = frameToSec(sceneItem.endFrame, tree.frameRate);
  const deltaSec = computeSceneExtendDelta(sceneEndSec, clipEndSec);
  if (deltaSec <= 0) {
    return { deltaSec: 0, extended: false };
  }

  const requiredEndFrame = secToFrame(clipEndSec, tree.frameRate);
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
      "[extendSceneForAudio] structure ripple blocked:",
      structureResult.blockReason,
    );
    return { deltaSec: 0, extended: false };
  }

  const patches = diffTreeToPatches(
    structureResult.before,
    structureResult.next,
  );

  const clips = await localGetProjectAudioClips(projectId);
  const containers = buildRippleContainersFromTree(structureResult.before);
  const rippleClips = clips.map((c) => ({
    id: c.id,
    sceneId: c.sceneId,
    startSec: c.startSec,
    endSec: c.id === clipId ? Math.min(c.endSec, sceneEndSec) : c.endSec,
    crossScene: Boolean(c.crossScene),
  }));

  const clipRipple = calculateRipple({
    changedClipId: clipId,
    newEndSec: clipEndSec,
    allClips: rippleClips,
    allScenes: containers.scenes,
    allSequences: containers.sequences,
    allActs: containers.acts,
  });

  await persistAudioRippleWithRollback(patches, clips, clipRipple);

  return { deltaSec, extended: true };
}
