/**
 * Resolve which scene contains a timeline second (T32 drop target).
 * Location: src/lib/mve/resolve-scene-at-timeline-sec.ts
 */

export interface SceneTimeBlock {
  id: string;
  startSec: number;
  endSec: number;
}

export function resolveSceneIdAtTimelineSec(
  timeSec: number,
  scenes: SceneTimeBlock[],
): string | undefined {
  return scenes.find((s) => timeSec >= s.startSec && timeSec < s.endSec)?.id;
}

export function timelineSecFromPointer(
  clientX: number,
  containerLeft: number,
  viewStartSec: number,
  pxPerSec: number,
): number {
  return viewStartSec + (clientX - containerLeft) / pxPerSec;
}

export function sceneBlockForId(
  sceneId: string,
  scenes: SceneTimeBlock[],
): SceneTimeBlock | undefined {
  return scenes.find((s) => s.id === sceneId);
}

export function nextLineOrderIndex(
  linesInTargetScene: Array<{ orderIndex?: number }>,
): number {
  if (linesInTargetScene.length === 0) return 0;
  return Math.max(...linesInTargetScene.map((l) => l.orderIndex ?? 0), 0) + 1;
}

/** Next `orderIndex` for a new text-only line on a dialog lane in a scene. */
export function nextLineOrderIndexForScene(
  lines: Array<{
    sceneId: string;
    characterId?: string;
    audioClipId?: string | null;
    orderIndex?: number;
  }>,
  sceneId: string,
  characterId: string,
): number {
  const inScene = lines.filter(
    (l) =>
      l.sceneId === sceneId && !l.audioClipId && l.characterId === characterId,
  );
  return nextLineOrderIndex(inScene);
}

export function clipTimesAfterSceneMove(
  clipStartSec: number,
  clipEndSec: number,
  targetScene: SceneTimeBlock,
): { startSec: number; endSec: number } {
  const duration = Math.max(0, clipEndSec - clipStartSec);
  const startSec = targetScene.startSec;
  return { startSec, endSec: startSec + duration };
}
