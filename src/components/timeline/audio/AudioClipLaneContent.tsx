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
import { useMveTextBlockLaneDrop } from "@/hooks/useMveTextBlockLaneDrop";
import { MveTextBlockLaneItems } from "./MveTextBlockLaneItems";

export interface MveLineClipHandlers {
  projectId: string;
  lineByClipId: Map<string, MveLine>;
  linesByCharacterId?: Map<string, MveLine[]>;
  onSaveText: (lineId: string, text: string) => Promise<void>;
  onSaveDirection: (
    lineId: string,
    direction: MveLineDirection,
  ) => Promise<void>;
  onBindAudioClip?: (lineId: string, clipId: string | null) => Promise<void>;
  onMoveLineToScene?: (lineId: string, targetSceneId: string) => Promise<void>;
  linkedSceneIdForLane?: (laneIndex: number) => string | undefined;
  getRenderBlockReason?: (line: MveLine) => string | undefined;
  onRenderLine?: (lineId: string) => Promise<unknown>;
  isRenderingLineId?: string | null;
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
  className,
}: AudioClipLaneContentProps) {
  const audible = isLaneAudible(laneIndex, laneState.laneStates);
  const characterId = characterLanes?.characterIdForLane(laneIndex);
  const textOnlyLines = characterId
    ? (mveLines?.linesByCharacterId?.get(characterId) ?? [])
    : [];
  const locked = laneState.getLaneState(laneIndex)?.locked ?? false;

  const { dragOverSceneId, onDragOver, onDragLeave, onDrop } =
    useMveTextBlockLaneDrop({
      enabled: Boolean(mveLines?.onMoveLineToScene) && !locked,
      sceneBlocks,
      viewStartSec,
      pxPerSec,
      onMoveLineToScene: mveLines?.onMoveLineToScene,
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
        dragOverSceneId && "ring-1 ring-inset ring-primary/40",
        className,
      )}
      style={{ height: `${height}px`, width: `${totalWidthPx}px` }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      data-testid={`audio-lane-content-${laneIndex}`}
    >
      {sceneBlocks.map((block) =>
        dragOverSceneId === block.id ? (
          <div
            key={`drop-hint-${block.id}`}
            className="pointer-events-none absolute top-0 bottom-0 bg-primary/10 border-x border-primary/30"
            style={{
              left: `${(block.startSec - viewStartSec) * pxPerSec}px`,
              width: `${(block.endSec - block.startSec) * pxPerSec}px`,
            }}
          />
        ) : null,
      )}
      {clips.map((clip) => (
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
          mveLine={mveLines?.lineByClipId.get(clip.id)}
          mveProjectId={mveLines?.projectId}
          onMveSaveText={mveLines?.onSaveText}
          onMveSaveDirection={mveLines?.onSaveDirection}
          mveRenderBlockReason={(() => {
            const line = mveLines?.lineByClipId.get(clip.id);
            return line && mveLines?.getRenderBlockReason
              ? mveLines.getRenderBlockReason(line)
              : undefined;
          })()}
          onMveRenderLine={mveLines?.onRenderLine}
          mveIsRendering={
            mveLines?.isRenderingLineId != null &&
            mveLines.lineByClipId.get(clip.id)?.id ===
              mveLines.isRenderingLineId
          }
        />
      ))}
      <MveTextBlockLaneItems
        lines={textOnlyLines}
        pxPerSec={pxPerSec}
        viewStartSec={viewStartSec}
        sceneBlocks={sceneBlocks}
        characterId={characterId}
        sceneOptions={sceneOptions}
        mveLines={mveLines}
        draggable={Boolean(mveLines?.onMoveLineToScene) && !locked}
      />
    </div>
  );
}
