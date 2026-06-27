/**
 * Drop-target handlers for moving MVE text blocks between scenes (T32).
 * Location: src/hooks/useMveTextBlockLaneDrop.ts
 */

import { useCallback, useState, type DragEvent } from "react";
import {
  resolveSceneIdAtTimelineSec,
  timelineSecFromPointer,
  type SceneTimeBlock,
} from "@/lib/mve/resolve-scene-at-timeline-sec";

export const MVE_LINE_DRAG_MIME = "application/x-scriptony-mve-line-id";

export interface UseMveTextBlockLaneDropOptions {
  enabled?: boolean;
  sceneBlocks: SceneTimeBlock[];
  viewStartSec: number;
  pxPerSec: number;
  onMoveLineToScene?: (lineId: string, targetSceneId: string) => Promise<void>;
}

export function useMveTextBlockLaneDrop({
  enabled = true,
  sceneBlocks,
  viewStartSec,
  pxPerSec,
  onMoveLineToScene,
}: UseMveTextBlockLaneDropOptions) {
  const [dragOverSceneId, setDragOverSceneId] = useState<string | null>(null);

  const resolveTargetScene = useCallback(
    (clientX: number, currentTarget: EventTarget | null) => {
      const el = currentTarget as HTMLElement | null;
      const rect = el?.getBoundingClientRect();
      if (!rect) return undefined;
      const timeSec = timelineSecFromPointer(
        clientX,
        rect.left,
        viewStartSec,
        pxPerSec,
      );
      return resolveSceneIdAtTimelineSec(timeSec, sceneBlocks);
    },
    [sceneBlocks, viewStartSec, pxPerSec],
  );

  const onDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (!enabled || !onMoveLineToScene) return;
      if (!e.dataTransfer.types.includes(MVE_LINE_DRAG_MIME)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverSceneId(
        resolveTargetScene(e.clientX, e.currentTarget) ?? null,
      );
    },
    [enabled, onMoveLineToScene, resolveTargetScene],
  );

  const onDragLeave = useCallback(() => {
    setDragOverSceneId(null);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (!enabled || !onMoveLineToScene) return;
      e.preventDefault();
      setDragOverSceneId(null);
      const lineId = e.dataTransfer.getData(MVE_LINE_DRAG_MIME);
      if (!lineId) return;
      const targetSceneId = resolveTargetScene(e.clientX, e.currentTarget);
      if (!targetSceneId) return;
      void onMoveLineToScene(lineId, targetSceneId);
    },
    [enabled, onMoveLineToScene, resolveTargetScene],
  );

  return { dragOverSceneId, onDragOver, onDragLeave, onDrop };
}

export function textBlockTimingForLine(
  lineSceneId: string,
  sceneBlocks: SceneTimeBlock[],
  fallbackStart = 0,
  fallbackDuration = 3,
): { startSec: number; endSec: number } {
  const block = sceneBlocks.find((s) => s.id === lineSceneId);
  if (block) {
    return { startSec: block.startSec, endSec: block.endSec };
  }
  return {
    startSec: fallbackStart,
    endSec: fallbackStart + fallbackDuration,
  };
}
