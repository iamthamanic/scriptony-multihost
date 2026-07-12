/**
 * AudioTimelineMveTextBlock — positioned wrapper for inline MveDialogClipHost.
 *
 * Location: src/components/audio/AudioTimelineMveTextBlock.tsx
 */

import { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  maxVisualContentEndSecInScene,
  resolveMveDialogClipWidthPx,
  resolveMveLineVisualSpanMapWithDraft,
} from "@/lib/mve/mve-dialog-clip-layout";
import { isContentDrivenSceneDuration } from "@/lib/mve/scene-duration-policy";
import { applyMveSceneWidthPreviewPx } from "@/lib/ripple-engine/preview";
import { MVE_LINE_DRAG_MIME } from "@/hooks/useMveTextBlockLaneDrop";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { MveLineDirection } from "@/lib/multi-voice-engine/schema/line-direction";
import { MveDialogClipHost } from "../structure/timeline/mve/MveDialogClipHost";
import type { MveStructurePickerRefs } from "../structure/timeline/mve/MveStructureScenePickerModal";
import type { MveSceneOption } from "@/hooks/useMveTextBlockAudio";
import type { SceneTimeBlock } from "@/lib/mve/resolve-scene-at-timeline-sec";
import type { Character } from "@/lib/types";

/** Backend scene resize round-trip — kept short; the pink shell also gets an
 * immediate DOM-only width preview per keystroke (see `handleDraftTextChange`). */
const SCENE_SYNC_DEBOUNCE_MS = 300;

export interface AudioTimelineMveTextBlockProps {
  line: MveLine;
  linesInLane?: MveLine[];
  pxPerSec: number;
  viewStartSec: number;
  startSec: number;
  endSec: number;
  readingSpeedWpm?: number;
  projectId?: string;
  projectType?: string;
  sceneId?: string;
  sceneLabel?: string;
  character?: Character;
  scenes?: MveSceneOption[];
  structurePicker?: MveStructurePickerRefs;
  onSaveText?: (lineId: string, text: string) => Promise<void>;
  onSaveDirection?: (
    lineId: string,
    direction: MveLineDirection,
  ) => Promise<void>;
  onBindAudioClip?: (lineId: string, clipId: string | null) => Promise<void>;
  onDeleteLine?: (lineId: string) => Promise<void>;
  onSyncSceneForDraft?: (lineId: string, draftText: string) => void;
  sceneBlocks?: SceneTimeBlock[];
  sceneBlock?: { startSec: number; endSec: number };
  onClick?: (lineId: string) => void;
  draggable?: boolean;
}

export function AudioTimelineMveTextBlock({
  line,
  linesInLane = [],
  pxPerSec,
  viewStartSec,
  startSec,
  endSec,
  readingSpeedWpm,
  projectId,
  projectType,
  sceneId,
  sceneLabel,
  character,
  scenes = [],
  structurePicker,
  onSaveText,
  onSaveDirection,
  onBindAudioClip,
  onDeleteLine,
  onSyncSceneForDraft,
  sceneBlock,
  sceneBlocks = [],
  onClick,
  draggable: draggableProp,
}: AudioTimelineMveTextBlockProps) {
  const [draftText, setDraftText] = useState<string | null>(null);
  const [textareaFocused, setTextareaFocused] = useState(false);
  const sceneSyncTimerRef = useRef<number | null>(null);

  const previewSpan = useMemo(() => {
    if (draftText == null || draftText === (line.text ?? "")) {
      return { startSec, endSec };
    }
    const laneLines = linesInLane.length > 0 ? linesInLane : [line];
    const spans = resolveMveLineVisualSpanMapWithDraft(
      laneLines,
      sceneBlocks,
      pxPerSec,
      line.id,
      draftText,
      readingSpeedWpm,
    );
    return spans.get(line.id) ?? { startSec, endSec };
  }, [
    draftText,
    line,
    linesInLane,
    sceneBlocks,
    pxPerSec,
    readingSpeedWpm,
    startSec,
    endSec,
  ]);

  const clipWidthPx = resolveMveDialogClipWidthPx(
    previewSpan.startSec,
    previewSpan.endSec,
    pxPerSec,
    sceneBlock,
  );

  const style = useMemo(
    () => ({
      left: `${(previewSpan.startSec - viewStartSec) * pxPerSec}px`,
      width: `${clipWidthPx}px`,
    }),
    [previewSpan.startSec, viewStartSec, pxPerSec, clipWidthPx],
  );

  const handleDraftTextChange = useCallback(
    (text: string) => {
      setDraftText(text);

      if (sceneId && isContentDrivenSceneDuration(projectType)) {
        const sceneBlockFull = sceneBlocks.find((b) => b.id === sceneId);
        if (sceneBlockFull) {
          const laneLines = linesInLane.length > 0 ? linesInLane : [line];
          const merged = laneLines.map((l) =>
            l.id === line.id ? { ...l, text } : l,
          );
          const requiredEndSec = maxVisualContentEndSecInScene(
            sceneBlockFull,
            merged,
            pxPerSec,
            readingSpeedWpm,
          );
          applyMveSceneWidthPreviewPx(
            sceneId,
            (requiredEndSec - sceneBlockFull.startSec) * pxPerSec,
          );
        }
      }

      if (!onSyncSceneForDraft) return;
      if (sceneSyncTimerRef.current) {
        window.clearTimeout(sceneSyncTimerRef.current);
      }
      sceneSyncTimerRef.current = window.setTimeout(() => {
        onSyncSceneForDraft(line.id, text);
      }, SCENE_SYNC_DEBOUNCE_MS);
    },
    [
      line,
      linesInLane,
      sceneId,
      sceneBlocks,
      pxPerSec,
      readingSpeedWpm,
      projectType,
      onSyncSceneForDraft,
    ],
  );

  useEffect(
    () => () => {
      if (sceneSyncTimerRef.current) {
        window.clearTimeout(sceneSyncTimerRef.current);
      }
    },
    [],
  );

  const canEdit = Boolean(projectId && onSaveText);
  const canDrag = Boolean(draggableProp) && !textareaFocused;

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!canDrag) return;
      e.dataTransfer.setData(MVE_LINE_DRAG_MIME, line.id);
      e.dataTransfer.effectAllowed = "move";
    },
    [canDrag, line.id],
  );

  const handleWrapperMouseDownCapture = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (!target.closest("textarea, input, [contenteditable='true']")) return;
      // Sync disable — React state alone is too late for WKWebView click-to-focus.
      e.currentTarget.draggable = false;
      setTextareaFocused(true);
    },
    [],
  );

  const handleTextareaFocusChange = useCallback((focused: boolean) => {
    setTextareaFocused(focused);
  }, []);

  if (!canEdit || !projectId || !onSaveText) {
    return null;
  }

  return (
    <div
      draggable={canDrag}
      onDragStart={handleDragStart}
      onMouseDownCapture={handleWrapperMouseDownCapture}
      className={cn(
        "absolute inset-y-0 overflow-hidden rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        canDrag && "cursor-grab active:cursor-grabbing",
      )}
      style={style}
      onClick={() => onClick?.(line.id)}
      data-testid="audio-timeline-mve-text-block"
      data-mve-line-id={line.id}
      data-mve-scene-id={sceneId}
    >
      <MveDialogClipHost
        line={line}
        clipWidthPx={clipWidthPx}
        timelineStartSec={previewSpan.startSec}
        projectId={projectId}
        projectType={projectType}
        sceneId={sceneId}
        sceneLabel={sceneLabel}
        character={character}
        scenes={scenes}
        structurePicker={structurePicker}
        onSaveText={onSaveText}
        onSaveDirection={onSaveDirection}
        onBindAudioClip={onBindAudioClip}
        onDeleteLine={onDeleteLine}
        onDraftTextChange={handleDraftTextChange}
        readingSpeedWpm={readingSpeedWpm}
        onTextareaFocusChange={handleTextareaFocusChange}
      />
    </div>
  );
}
