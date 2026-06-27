/**
 * AudioClipLaneTracks — DAW lanes (mixer column + scrollable clip area).
 * REFACTORED: extracted AudioClipLaneSidebar, AudioClipLaneContent (T26).
 */

import { cn } from "../../../lib/utils";
import { getLaneType, LANE_UI } from "../../../lib/audio-lane";
import { AudioClipLaneSidebar } from "./AudioClipLaneSidebar";
import { AudioClipLaneContent } from "./AudioClipLaneContent";
import type { AudioClip } from "../../../lib/types";
import type { useAudioLaneState } from "../../../hooks/useAudioLaneState";
import type { useTimelineAddAudio } from "../../../hooks/useTimelineAddAudio";
import type { useCharacterLaneMap } from "../../../hooks/useCharacterLaneMap";
import type { TimelineSceneRef } from "../../../lib/timeline-add-audio";
import type { SceneTimeBlock } from "@/lib/mve/resolve-scene-at-timeline-sec";
import type { MveLineClipHandlers } from "./AudioClipLaneContent";
import type { MveLaneLinkControlProps } from "./AudioClipLaneSidebar";

export interface AudioClipLaneHandlers {
  handleTrimEnd: (clipId: string, newEndSec: number) => void;
  handleLaneChange: (clipId: string, newLaneIndex: number) => void;
  handleDeleteLane: (laneIndex: number) => Promise<void>;
  handleFxSlotChange: (
    laneIndex: number,
    slotIndex: number,
    presetId: string | null,
  ) => void;
  handleFxChainEnabledChange: (laneIndex: number, enabled: boolean) => void;
  handleGenerateTts: (clip: AudioClip) => void;
}

export interface AudioClipLaneTracksProps {
  pxPerSec: number;
  viewStartSec?: number;
  totalWidthPx: number;
  scenes?: TimelineSceneRef[];
  sceneBlocks?: SceneTimeBlock[];
  laneGroups: Record<number, AudioClip[]>;
  sortedLaneIndices: number[];
  allClips?: AudioClip[];
  laneState: ReturnType<typeof useAudioLaneState>;
  handlers: AudioClipLaneHandlers;
  labelMode: "sidebar" | "content-only";
  /** VET left column is already 248px — avoid double fixed width overflow. */
  fullWidthSidebar?: boolean;
  className?: string;
  currentTimeSec?: number;
  expandedLane?: number | null;
  onExpandedLaneChange?: (laneIndex: number | null) => void;
  addAudio?: Pick<
    ReturnType<typeof useTimelineAddAudio>,
    | "isBusy"
    | "recordingLane"
    | "countInLane"
    | "addGenerated"
    | "triggerUpload"
    | "toggleRecord"
    | "addSfxLane"
    | "generateBlockReasonForLane"
  >;
  characterLanes?: Pick<
    ReturnType<typeof useCharacterLaneMap>,
    | "getCharacterForLane"
    | "characterIdForLane"
    | "dialogLaneOrder"
    | "reorderCharacters"
    | "isReordering"
  > & { allClips?: AudioClip[] };
  mveLines?: MveLineClipHandlers;
  onAddMveTextBlock?: (payload: {
    laneIndex: number;
    characterId: string;
    sceneId: string;
    startSec: number;
  }) => Promise<void> | void;
  linkedSceneIdForLane?: (laneIndex: number) => string | undefined;
  getMveLaneLinkForLane?: (
    laneIndex: number,
  ) =>
    | Omit<
        MveLaneLinkControlProps,
        "enabled" | "acts" | "sequences" | "structureScenes" | "isMutating"
      >
    | undefined;
  mveLaneLinkBase?: Pick<
    MveLaneLinkControlProps,
    "enabled" | "acts" | "sequences" | "structureScenes" | "isMutating"
  >;
}

function laneHeight(expandedLane: number | null, laneIndex: number): number {
  return expandedLane === laneIndex
    ? LANE_UI.heightExpanded
    : LANE_UI.heightCompact;
}

export function AudioClipLaneTracks({
  pxPerSec,
  viewStartSec = 0,
  totalWidthPx,
  scenes = [],
  sceneBlocks = [],
  laneGroups,
  sortedLaneIndices,
  allClips = [],
  laneState,
  handlers,
  labelMode,
  fullWidthSidebar = false,
  className,
  currentTimeSec = 0,
  expandedLane = null,
  onExpandedLaneChange,
  addAudio,
  characterLanes,
  mveLines,
  onAddMveTextBlock,
  linkedSceneIdForLane,
  getMveLaneLinkForLane,
  mveLaneLinkBase,
}: AudioClipLaneTracksProps) {
  const {
    handleTrimEnd,
    handleLaneChange,
    handleDeleteLane,
    handleFxSlotChange,
    handleFxChainEnabledChange,
    handleGenerateTts,
  } = handlers;

  if (sortedLaneIndices.length === 0) {
    if (labelMode === "sidebar") {
      return (
        <div
          className={cn(
            "border-b border-border px-2 flex items-center bg-card text-[9px] text-muted-foreground",
            className,
          )}
          style={{ height: `${LANE_UI.heightCompact}px` }}
        >
          Audio-Spuren (Struktur anlegen)
        </div>
      );
    }
    return null;
  }

  return (
    <>
      {sortedLaneIndices.map((laneIndex) => {
        const expanded = expandedLane === laneIndex;
        const height = laneHeight(expandedLane, laneIndex);
        const clips = laneGroups[laneIndex] ?? [];
        const locked = laneState.getLaneState(laneIndex)?.locked ?? false;
        const character = characterLanes?.getCharacterForLane(laneIndex);

        if (labelMode === "sidebar") {
          return (
            <AudioClipLaneSidebar
              key={`lane-label-${laneIndex}`}
              fullWidth={fullWidthSidebar}
              laneIndex={laneIndex}
              expanded={expanded}
              expandedLane={expandedLane}
              locked={locked}
              character={character}
              addAudio={addAudio}
              scenes={scenes}
              currentTimeSec={currentTimeSec}
              onExpandedLaneChange={onExpandedLaneChange}
              onMuteChange={laneState.setMute}
              onSoloChange={laneState.setSolo}
              onVolumeChange={laneState.setVolume}
              onPanChange={laneState.setPan}
              onFxSlotChange={handleFxSlotChange}
              onFxChainEnabledChange={handleFxChainEnabledChange}
              onRecordToggle={
                addAudio
                  ? () => addAudio.toggleRecord(laneIndex, currentTimeSec)
                  : undefined
              }
              onDeleteLane={handleDeleteLane}
              onAddMveTextBlock={onAddMveTextBlock}
              linkedSceneId={linkedSceneIdForLane?.(laneIndex)}
              mveLaneLink={
                mveLaneLinkBase?.enabled && getMveLaneLinkForLane
                  ? {
                      ...mveLaneLinkBase,
                      ...getMveLaneLinkForLane(laneIndex),
                    }
                  : undefined
              }
              allClips={allClips}
              className={className}
            />
          );
        }

        return (
          <AudioClipLaneContent
            key={`lane-content-${laneIndex}`}
            laneIndex={laneIndex}
            height={height}
            totalWidthPx={totalWidthPx}
            scenes={scenes}
            sceneBlocks={sceneBlocks}
            clips={clips}
            pxPerSec={pxPerSec}
            viewStartSec={viewStartSec}
            laneState={laneState}
            onTrimEnd={handleTrimEnd}
            onLaneChange={handleLaneChange}
            onGenerateTts={handleGenerateTts}
            allClips={allClips}
            characterLanes={characterLanes}
            mveLines={mveLines}
            className={className}
          />
        );
      })}
    </>
  );
}
