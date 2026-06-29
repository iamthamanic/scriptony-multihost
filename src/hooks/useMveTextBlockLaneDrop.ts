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
  type MveLineSpan,
} from "@/lib/mve/resolve-mve-line-span";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";

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
