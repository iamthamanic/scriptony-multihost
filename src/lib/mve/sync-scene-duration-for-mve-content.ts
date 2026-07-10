/**
 * Sync structure scene duration to MVE text content (content-driven audio projects).
 *
 * Location: src/lib/mve/sync-scene-duration-for-mve-content.ts
 */

import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import { resizeSceneForContent } from "@/lib/structure/resize-scene-for-content";
import { isContentDrivenSceneDuration } from "./scene-duration-policy";
import { maxVisualContentEndSecInScene } from "./mve-dialog-clip-layout";
import { sortLinesInScene } from "./resolve-mve-line-span";
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
  pxPerSec?: number;
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
    const pxPerSec = Math.max(input.pxPerSec ?? 1, 1e-6);
    requiredEndSec = maxVisualContentEndSecInScene(
      sceneBlock,
      textOnlyInScene,
      pxPerSec,
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

/** Grow scenes on load when stacked text blocks extend past scene shell (existing projects). */
export async function reconcileMveSceneDurations(input: {
  projectId: string;
  projectType?: string | null;
  sceneBlocks: SceneTimeBlock[];
  lines: MveLine[];
  readingSpeedWpm?: number;
  pxPerSec?: number;
}): Promise<boolean> {
  if (!isContentDrivenSceneDuration(input.projectType)) return false;

  const textOnly = sortLinesInScene(input.lines.filter((l) => !l.audioClipId));
  if (textOnly.length === 0) return false;

  const pxPerSec = Math.max(input.pxPerSec ?? 1, 1e-6);
  const sceneIds = [...new Set(textOnly.map((l) => l.sceneId))];
  let anySynced = false;

  for (const sceneId of sceneIds) {
    const sceneBlock = sceneBlockForId(sceneId, input.sceneBlocks);
    if (!sceneBlock) continue;

    const inScene = textOnly.filter((l) => l.sceneId === sceneId);
    const requiredEndSec = maxVisualContentEndSecInScene(
      sceneBlock,
      inScene,
      pxPerSec,
      input.readingSpeedWpm,
    );
    if (requiredEndSec <= sceneBlock.endSec + 1e-6) continue;

    const { resized } = await resizeSceneForContent({
      projectId: input.projectId,
      sceneId,
      requiredEndSec,
    });
    if (resized) anySynced = true;
  }

  return anySynced;
}
