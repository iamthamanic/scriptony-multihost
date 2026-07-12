/**
 * AudioClipLaneContent — scrollable clip area for DAW lanes.
 * Extracted from AudioClipLaneTracks.tsx to respect the 150-line component limit (T26).
 */

import { cn } from "../../../lib/utils";
import { isLaneAudible } from "../../../lib/audio-lane";
import { AudioTimelineSegment } from "../../audio/AudioTimelineSegment";
import type { AudioClip } from "../../../lib/types";
import type { useAudioLaneState } from "../../../hooks/useAudioLaneState";
import type { useCharacterLaneMap } from "../../../hooks/useCharacterLaneMap";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { MveLineDirection } from "@/lib/multi-voice-engine/schema/line-direction";
import type { TimelineSceneRef } from "../../../lib/timeline-add-audio";
import type { SceneTimeBlock } from "@/lib/mve/resolve-scene-at-timeline-sec";
import type { MveStructurePickerRefs } from "../../structure/timeline/mve/MveStructureScenePickerModal";
import { useMveTextBlockLaneDrop } from "@/hooks/useMveTextBlockLaneDrop";
import { TIMELINE_INSERTION_DROP_ZONE_CLASS } from "@/lib/ripple-engine/preview";
import { MveTextBlockLaneItems } from "./MveTextBlockLaneItems";
import { shouldSkipMveDialogClipSegment } from "@/lib/mve/mve-dialog-clip-dedup";

export interface MveLineClipHandlers {
  projectId: string;
  projectType?: string;
  lineByClipId: Map<string, MveLine>;
  linesByCharacterId?: Map<string, MveLine[]>;
  structurePicker?: MveStructurePickerRefs;
  onSaveText: (lineId: string, text: string) => Promise<void>;
  onSaveDirection: (
    lineId: string,
    direction: MveLineDirection,
  ) => Promise<void>;
  onBindAudioClip?: (lineId: string, clipId: string | null) => Promise<void>;
  onMoveLineToScene?: (lineId: string, targetSceneId: string) => Promise<void>;
  onReorderLineInScene?: (
    lineId: string,
    sceneId: string,
    targetIndex: number,
  ) => Promise<void>;
  onSyncSceneForDraft?: (lineId: string, draftText: string) => void;
  linkedSceneIdForLane?: (laneIndex: number) => string | undefined;
  getRenderBlockReason?: (line: MveLine) => string | undefined;
  onRenderLine?: (lineId: string) => Promise<unknown>;
  isRenderingLineId?: string | null;
  getSceneLabel?: (sceneId: string) => string | undefined;
  onDeleteLine?: (lineId: string) => Promise<void>;
}

export interface AudioClipLaneContentProps {
  laneIndex: number;
  height: number;
  totalWidthPx: number;
  scenes?: TimelineSceneRef[];
  sceneBlocks?: SceneTimeBlock[];
  clips: AudioClip[];
  pxPerSec: number;
  viewStartSec: number;
  laneState: ReturnType<typeof useAudioLaneState>;
  onTrimEnd: (clipId: string, newEndSec: number) => void;
  onLaneChange: (clipId: string, newLaneIndex: number) => void;
  onGenerateTts: (clip: AudioClip) => void;
  allClips?: AudioClip[];
  characterLanes?: Pick<
    ReturnType<typeof useCharacterLaneMap>,
    "getCharacterForLane" | "characterIdForLane" | "dialogLaneOrder"
  >;
  readingSpeedWpm?: number;
  mveLines?: MveLineClipHandlers;
  className?: string;
}

export function AudioClipLaneContent({
  laneIndex,
  height,
  totalWidthPx,
  scenes = [],
  sceneBlocks = [],
  clips,
  pxPerSec,
  viewStartSec,
  laneState,
  onTrimEnd,
  onLaneChange,
  onGenerateTts,
  allClips = [],
  characterLanes,
  mveLines,
  readingSpeedWpm,
  className,
}: AudioClipLaneContentProps) {
  const audible = isLaneAudible(laneIndex, laneState.laneStates);
  const characterId = characterLanes?.characterIdForLane(laneIndex);
  const character = characterLanes?.getCharacterForLane(laneIndex);
  const textOnlyLines = characterId
    ? (mveLines?.linesByCharacterId?.get(characterId) ?? [])
    : [];
  const locked = laneState.getLaneState(laneIndex)?.locked ?? false;

  const { dragOverSceneId, onDragOver, onDragLeave, onDrop } =
    useMveTextBlockLaneDrop({
      enabled:
        Boolean(
          mveLines?.onMoveLineToScene || mveLines?.onReorderLineInScene,
        ) && !locked,
      sceneBlocks,
      viewStartSec,
      pxPerSec,
      onMoveLineToScene: mveLines?.onMoveLineToScene,
      onReorderLineInScene: mveLines?.onReorderLineInScene,
      linesInLane: textOnlyLines,
      readingSpeedWpm,
    });

  const sceneOptions = scenes.map((s) => ({
    id: s.id,
    name: "name" in s ? String(s.name) : s.id,
  }));

  return (
    <div
      className={cn(
        "relative border-b border-border bg-muted/10 shrink-0",
        !audible && "opacity-30",
        className,
      )}
      style={{ height: `${height}px`, width: `${totalWidthPx}px` }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      data-testid={`audio-lane-content-${laneIndex}`}
      data-audio-lane-drop-stack="true"
    >
      {sceneBlocks.map((block) =>
        dragOverSceneId === block.id ? (
          <div
            key={`drop-hint-${block.id}`}
            className={TIMELINE_INSERTION_DROP_ZONE_CLASS}
            style={{
              left: `${(block.startSec - viewStartSec) * pxPerSec}px`,
              width: `${Math.max(
                12,
                (block.endSec - block.startSec) * pxPerSec,
              )}px`,
            }}
          />
        ) : null,
      )}
      {clips.map((clip) => {
        const line = mveLines?.lineByClipId.get(clip.id);
        const skipMveDialogSegment = shouldSkipMveDialogClipSegment(
          clip,
          line,
          textOnlyLines,
        );
        const sceneLabel =
          (line?.sceneId && mveLines?.getSceneLabel?.(line.sceneId)) ||
          sceneOptions.find((s) => s.id === line?.sceneId)?.name;
        const mveSceneBlock = line?.sceneId
          ? sceneBlocks.find((b) => b.id === line.sceneId)
          : undefined;
        return (
          <AudioTimelineSegment
            key={clip.id}
            item={clip}
            pxPerSec={pxPerSec}
            viewStartSec={viewStartSec}
            onTrimEnd={onTrimEnd}
            isEditable={!locked}
            onGenerateTts={() => onGenerateTts(clip)}
            allClips={allClips}
            onLaneChange={onLaneChange}
            mveLine={skipMveDialogSegment ? undefined : line}
            mveProjectId={mveLines?.projectId}
            mveProjectType={mveLines?.projectType}
            mveCharacter={character}
            mveSceneLabel={sceneLabel}
            mveSceneBlock={
              mveSceneBlock
                ? {
                    startSec: mveSceneBlock.startSec,
                    endSec: mveSceneBlock.endSec,
                  }
                : undefined
            }
            mveScenes={sceneOptions}
            mveStructurePicker={mveLines?.structurePicker}
            onMveSaveText={mveLines?.onSaveText}
            onMveSaveDirection={mveLines?.onSaveDirection}
            onMveBindAudioClip={mveLines?.onBindAudioClip}
            onMveDeleteLine={mveLines?.onDeleteLine}
            mveRenderBlockReason={
              line && mveLines?.getRenderBlockReason
                ? mveLines.getRenderBlockReason(line)
                : undefined
            }
            onMveRenderLine={mveLines?.onRenderLine}
            mveIsRendering={
              mveLines?.isRenderingLineId != null &&
              line?.id === mveLines.isRenderingLineId
            }
          />
        );
      })}
      <MveTextBlockLaneItems
        lines={textOnlyLines}
        pxPerSec={pxPerSec}
        viewStartSec={viewStartSec}
        sceneBlocks={sceneBlocks}
        characterId={characterId}
        character={character}
        sceneOptions={sceneOptions}
        mveLines={mveLines}
        readingSpeedWpm={readingSpeedWpm}
        draggable={
          Boolean(
            mveLines?.onMoveLineToScene || mveLines?.onReorderLineInScene,
          ) && !locked
        }
      />
    </div>
  );
}
