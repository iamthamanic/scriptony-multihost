/**
 * AudioTimelineMveDialogSegment — MVE-bound audio clip with inline dialog card + trim.
 * Location: src/components/audio/AudioTimelineMveDialogSegment.tsx
 */

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { hasOverlap } from "@/lib/audio-lane";
import { resolveMveDialogClipWidthPx } from "@/lib/mve/mve-dialog-clip-layout";
import type { AudioClip, Character } from "@/lib/types";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { MveLineDirection } from "@/lib/multi-voice-engine/schema/line-direction";
import { MveDialogClipHost } from "../structure/timeline/mve/MveDialogClipHost";
import type { MveStructurePickerRefs } from "../structure/timeline/mve/MveStructureScenePickerModal";
import type { MveSceneOption } from "@/hooks/useMveTextBlockAudio";
import { ClipLanePopover } from "./ClipLanePopover";

const MAX_WAVEFORM_SAMPLES = 200;

export interface AudioTimelineMveDialogSegmentProps {
  clip: AudioClip;
  line: MveLine;
  pxPerSec: number;
  viewStartSec?: number;
  isEditable?: boolean;
  onTrimEnd?: (clipId: string, newEndSec: number) => void;
  allClips?: AudioClip[];
  onLaneChange?: (clipId: string, newLaneIndex: number) => void;
  projectId: string;
  projectType?: string;
  sceneLabel?: string;
  character?: Character;
  scenes?: MveSceneOption[];
  structurePicker?: MveStructurePickerRefs;
  onSaveText: (lineId: string, text: string) => Promise<void>;
  onSaveDirection: (
    lineId: string,
    direction: MveLineDirection,
  ) => Promise<void>;
  onBindAudioClip?: (lineId: string, clipId: string | null) => Promise<void>;
  onDeleteLine?: (lineId: string) => Promise<void>;
  sceneBlock?: { startSec: number; endSec: number };
  renderBlockReason?: string;
  onRenderLine?: (lineId: string) => Promise<unknown>;
  isRendering?: boolean;
}

export function AudioTimelineMveDialogSegment({
  clip,
  line,
  pxPerSec,
  viewStartSec = 0,
  isEditable = false,
  onTrimEnd,
  allClips,
  onLaneChange,
  projectId,
  projectType,
  sceneLabel,
  character,
  scenes = [],
  structurePicker,
  onSaveText,
  onSaveDirection,
  onBindAudioClip,
  onDeleteLine,
  sceneBlock,
  renderBlockReason,
  onRenderLine,
  isRendering,
}: AudioTimelineMveDialogSegmentProps) {
  const durationSec = Math.max(clip.endSec - clip.startSec, 0.1);
  const startPx = (clip.startSec - viewStartSec) * pxPerSec;
  const widthPx = resolveMveDialogClipWidthPx(
    clip.startSec,
    clip.endSec,
    pxPerSec,
    sceneBlock,
    { allowPastSceneEnd: true },
  );
  const overlapping =
    allClips &&
    hasOverlap(
      allClips,
      { startSec: clip.startSec, endSec: clip.endSec, id: clip.id },
      clip.laneIndex,
    );

  const rawWaveform = clip.waveformData;
  const waveformData = rawWaveform?.length
    ? rawWaveform.length > MAX_WAVEFORM_SAMPLES
      ? rawWaveform.slice(0, MAX_WAVEFORM_SAMPLES)
      : rawWaveform
    : undefined;

  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isEditable) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      dragStartX.current = e.clientX;
      dragStartWidth.current = widthPx;
    },
    [isEditable, widthPx],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setIsDragging(false);
      const deltaPx = e.clientX - dragStartX.current;
      const newDurationSec = Math.max(
        (dragStartWidth.current + deltaPx) / pxPerSec,
        0.5,
      );
      onTrimEnd?.(clip.id, clip.startSec + newDurationSec);
    },
    [isDragging, pxPerSec, clip.id, clip.startSec, onTrimEnd],
  );

  const handleMouseLeave = useCallback(() => {
    if (isDragging) setIsDragging(false);
  }, [isDragging]);

  const headerAddon =
    onLaneChange && allClips ? (
      <ClipLanePopover
        clip={clip}
        allClips={allClips}
        onLaneChange={onLaneChange}
      />
    ) : null;

  return (
    <div
      className={cn(
        "absolute inset-y-0 overflow-hidden rounded focus-within:ring-1 focus-within:ring-ring",
        overlapping && "ring-2 ring-red-500 ring-inset",
        isDragging && "ring-2 ring-white/40",
      )}
      style={{ left: `${startPx}px`, width: `${widthPx}px` }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      data-testid="audio-timeline-mve-dialog-segment"
      data-mve-line-id={line.id}
      data-mve-scene-id={line.sceneId}
    >
      <MveDialogClipHost
        line={line}
        clipWidthPx={widthPx}
        timelineStartSec={clip.startSec}
        projectId={projectId}
        projectType={projectType}
        sceneId={line.sceneId}
        sceneLabel={sceneLabel}
        character={character}
        scenes={scenes}
        structurePicker={structurePicker}
        waveformData={waveformData}
        audioDurationSec={durationSec}
        headerAddon={headerAddon}
        renderBlockReason={renderBlockReason}
        onRenderLine={onRenderLine}
        isRendering={isRendering}
        onSaveText={onSaveText}
        onSaveDirection={onSaveDirection}
        onBindAudioClip={onBindAudioClip}
        onDeleteLine={onDeleteLine}
      />
      {isEditable ? (
        <div
          className="absolute right-0 top-0 bottom-0 z-30 w-2 cursor-col-resize bg-transparent hover:bg-white/20"
          onMouseDown={handleResizeMouseDown}
          aria-label="Clip verlängern/verkürzen"
          title="Ziehen zum Trimmen"
        />
      ) : null}
    </div>
  );
}
