/**
 * AudioTimelineMveTextBlock — positioned wrapper for inline MveDialogClipHost.
 *
 * Location: src/components/audio/AudioTimelineMveTextBlock.tsx
 */

import { useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { resolveMveDialogClipWidthPx } from "@/lib/mve/mve-dialog-clip-layout";
import { MVE_LINE_DRAG_MIME } from "@/hooks/useMveTextBlockLaneDrop";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { MveLineDirection } from "@/lib/multi-voice-engine/schema/line-direction";
import { MveDialogClipHost } from "../structure/timeline/mve/MveDialogClipHost";
import type { MveStructurePickerRefs } from "../structure/timeline/mve/MveStructureScenePickerModal";
import type { MveSceneOption } from "@/hooks/useMveTextBlockAudio";
import type { Character } from "@/lib/types";

export interface AudioTimelineMveTextBlockProps {
  line: MveLine;
  pxPerSec: number;
  viewStartSec: number;
  startSec: number;
  endSec: number;
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
  sceneBlock?: { startSec: number; endSec: number };
  onClick?: (lineId: string) => void;
  draggable?: boolean;
}

export function AudioTimelineMveTextBlock({
  line,
  pxPerSec,
  viewStartSec,
  startSec,
  endSec,
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
  sceneBlock,
  onClick,
  draggable: draggableProp,
}: AudioTimelineMveTextBlockProps) {
  const clipWidthPx = resolveMveDialogClipWidthPx(
    startSec,
    endSec,
    pxPerSec,
    sceneBlock,
  );

  const style = useMemo(
    () => ({
      left: `${(startSec - viewStartSec) * pxPerSec}px`,
      width: `${clipWidthPx}px`,
    }),
    [startSec, viewStartSec, pxPerSec, clipWidthPx],
  );

  const canEdit = Boolean(projectId && onSaveText);
  const canDrag = Boolean(draggableProp);

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!canDrag) return;
      e.dataTransfer.setData(MVE_LINE_DRAG_MIME, line.id);
      e.dataTransfer.effectAllowed = "move";
    },
    [canDrag, line.id],
  );

  if (!canEdit || !projectId || !onSaveText) {
    return null;
  }

  return (
    <div
      draggable={canDrag}
      onDragStart={handleDragStart}
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
        timelineStartSec={startSec}
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
      />
    </div>
  );
}
