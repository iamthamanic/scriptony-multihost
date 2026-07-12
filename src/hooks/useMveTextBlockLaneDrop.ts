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
import {
  resolveMveLineSpan,
  sortLinesInScene,
  type MveLineSpan,
} from "@/lib/mve/resolve-mve-line-span";
import { resolveMveLineVisualSpanMap } from "@/lib/mve/mve-dialog-clip-layout";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";

export const MVE_LINE_DRAG_MIME = "application/x-scriptony-mve-line-id";

export interface UseMveTextBlockLaneDropOptions {
  enabled?: boolean;
  sceneBlocks: SceneTimeBlock[];
  viewStartSec: number;
  pxPerSec: number;
  onMoveLineToScene?: (lineId: string, targetSceneId: string) => Promise<void>;
  /** Text-only siblings rendered in this lane — enables in-scene reorder detection. */
  linesInLane?: MveLine[];
  readingSpeedWpm?: number;
  /** Same-scene drop (reorder) instead of cross-scene move. */
  onReorderLineInScene?: (
    lineId: string,
    sceneId: string,
    targetIndex: number,
  ) => Promise<void>;
}

/** Target index (0-based, relative to siblings excluding the dragged line) from
 * pointer position vs. sibling visual-span midpoints. */
function resolveReorderTargetIndex(
  siblings: MveLine[],
  draggedLineId: string,
  sceneBlocks: SceneTimeBlock[],
  pxPerSec: number,
  readingSpeedWpm: number | undefined,
  pointerTimeSec: number,
): number {
  const ordered = sortLinesInScene(siblings);
  const spans = resolveMveLineVisualSpanMap(
    ordered,
    sceneBlocks,
    pxPerSec,
    readingSpeedWpm,
  );
  let index = 0;
  for (const sibling of ordered) {
    if (sibling.id === draggedLineId) continue;
    const span = spans.get(sibling.id);
    const midpointSec = span ? (span.startSec + span.endSec) / 2 : Infinity;
    if (pointerTimeSec < midpointSec) break;
    index += 1;
  }
  return index;
}

export function useMveTextBlockLaneDrop({
  enabled = true,
  sceneBlocks,
  viewStartSec,
  pxPerSec,
  onMoveLineToScene,
  linesInLane = [],
  readingSpeedWpm,
  onReorderLineInScene,
}: UseMveTextBlockLaneDropOptions) {
  const [dragOverSceneId, setDragOverSceneId] = useState<string | null>(null);

  const resolvePointerTimeSec = useCallback(
    (clientX: number, currentTarget: EventTarget | null) => {
      const el = currentTarget as HTMLElement | null;
      const rect = el?.getBoundingClientRect();
      if (!rect) return undefined;
      return timelineSecFromPointer(clientX, rect.left, viewStartSec, pxPerSec);
    },
    [viewStartSec, pxPerSec],
  );

  const resolveTargetScene = useCallback(
    (clientX: number, currentTarget: EventTarget | null) => {
      const timeSec = resolvePointerTimeSec(clientX, currentTarget);
      if (timeSec == null) return undefined;
      return resolveSceneIdAtTimelineSec(timeSec, sceneBlocks);
    },
    [sceneBlocks, resolvePointerTimeSec],
  );

  const onDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (!enabled || (!onMoveLineToScene && !onReorderLineInScene)) return;
      if (!e.dataTransfer.types.includes(MVE_LINE_DRAG_MIME)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverSceneId(
        resolveTargetScene(e.clientX, e.currentTarget) ?? null,
      );
    },
    [enabled, onMoveLineToScene, onReorderLineInScene, resolveTargetScene],
  );

  const onDragLeave = useCallback(() => {
    setDragOverSceneId(null);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (!enabled || (!onMoveLineToScene && !onReorderLineInScene)) return;
      e.preventDefault();
      setDragOverSceneId(null);
      const lineId = e.dataTransfer.getData(MVE_LINE_DRAG_MIME);
      if (!lineId) return;
      const targetSceneId = resolveTargetScene(e.clientX, e.currentTarget);
      if (!targetSceneId) return;

      const draggedLine = linesInLane.find((l) => l.id === lineId);
      if (
        draggedLine &&
        draggedLine.sceneId === targetSceneId &&
        onReorderLineInScene
      ) {
        const pointerTimeSec = resolvePointerTimeSec(
          e.clientX,
          e.currentTarget,
        );
        const siblings = linesInLane.filter(
          (l) => l.sceneId === targetSceneId && !l.audioClipId,
        );
        const targetIndex = resolveReorderTargetIndex(
          siblings,
          lineId,
          sceneBlocks,
          pxPerSec,
          readingSpeedWpm,
          pointerTimeSec ?? 0,
        );
        void onReorderLineInScene(lineId, targetSceneId, targetIndex);
        return;
      }

      if (!onMoveLineToScene) return;
      void onMoveLineToScene(lineId, targetSceneId);
    },
    [
      enabled,
      onMoveLineToScene,
      onReorderLineInScene,
      resolveTargetScene,
      resolvePointerTimeSec,
      linesInLane,
      sceneBlocks,
      pxPerSec,
      readingSpeedWpm,
    ],
  );

  return { dragOverSceneId, onDragOver, onDragLeave, onDrop };
}

export function textBlockTimingForLine(
  line: MveLine,
  sceneBlocks: SceneTimeBlock[],
  linesInScene: MveLine[] = [],
  readingSpeedWpm?: number,
  fallbackStart = 0,
  fallbackDuration = 3,
): MveLineSpan {
  const block = sceneBlocks.find((s) => s.id === line.sceneId);
  if (block) {
    const siblings = linesInScene.filter(
      (l) => l.sceneId === line.sceneId && !l.audioClipId,
    );
    return resolveMveLineSpan({
      line,
      sceneBlock: block,
      linesInScene: siblings.length > 0 ? siblings : [line],
      readingSpeedWpm,
    });
  }
  return {
    startSec: fallbackStart,
    endSec: fallbackStart + fallbackDuration,
    durationSec: fallbackDuration,
    source: "min",
  };
}
