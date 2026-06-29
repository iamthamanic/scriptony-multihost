/**
 * Sync structure scene duration to MVE text content (content-driven audio projects).
 *
 * Location: src/lib/mve/sync-scene-duration-for-mve-content.ts
 */

import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import { resizeSceneForContent } from "@/lib/structure/resize-scene-for-content";
import { isContentDrivenSceneDuration } from "./scene-duration-policy";
import {
  maxContentEndSecInScene,
  sortLinesInScene,
} from "./resolve-mve-line-span";
import {
  sceneBlockForId,
  type SceneTimeBlock,
} from "./resolve-scene-at-timeline-sec";

export interface SyncSceneDurationForMveContentInput {
  projectId: string;
  projectType?: string | null;
  sceneId: string;
  sceneBlocks: SceneTimeBlock[];
  lines: MveLine[];
  readingSpeedWpm?: number;
  clipId?: string;
  clipEndSec?: number;
}

export interface SyncSceneDurationForMveContentResult {
  synced: boolean;
  requiredEndSec?: number;
}

export async function syncSceneDurationForMveContent(
  input: SyncSceneDurationForMveContentInput,
): Promise<SyncSceneDurationForMveContentResult> {
  if (!isContentDrivenSceneDuration(input.projectType)) {
    return { synced: false };
  }

  const sceneBlock = sceneBlockForId(input.sceneId, input.sceneBlocks);
  if (!sceneBlock) {
    return { synced: false };
  }

  const textOnlyInScene = sortLinesInScene(
    input.lines.filter((l) => l.sceneId === input.sceneId && !l.audioClipId),
  );

  let requiredEndSec: number;

  if (input.clipId != null && input.clipEndSec != null) {
    requiredEndSec = input.clipEndSec;
  } else if (textOnlyInScene.length > 0) {
    requiredEndSec = maxContentEndSecInScene(
      sceneBlock,
      textOnlyInScene,
      input.readingSpeedWpm,
    );
  } else {
    return { synced: false };
  }

  const { resized } = await resizeSceneForContent({
    projectId: input.projectId,
    sceneId: input.sceneId,
    requiredEndSec,
    clipId: input.clipId,
  });

  return { synced: resized, requiredEndSec };
}
