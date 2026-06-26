/**
 * AudioClipLaneSidebar — sidebar label column for DAW lanes.
 * Extracted from AudioClipLaneTracks.tsx (T26).
 */

import { useState } from "react";
import { cn } from "../../../lib/utils";
import { getLaneType, LANE_UI } from "../../../lib/audio-lane";
import { isCharacterDialogLane } from "../../../lib/character-lane-map";
import { TrackHeader } from "../../audio/track-header/TrackHeader";
import { AddAudioTimelineMenu } from "./AddAudioTimelineMenu";
import { AddMveTextBlockButton } from "./AddMveTextBlockButton";
import { MveLaneLinkModal } from "../../structure/timeline/mve/MveLaneLinkModal";
import type {
  Act,
  AudioClip,
  Character,
  Scene,
  Sequence,
} from "../../../lib/types";
import type { AudioClipLaneTracksProps } from "./AudioClipLaneTracks";
import type { TimelineSceneRef } from "../../../lib/timeline-add-audio";

export interface MveLaneLinkControlProps {
  enabled?: boolean;
  acts?: Act[];
  sequences?: Sequence[];
  structureScenes?: Scene[];
  linkedSceneId?: string;
  laneLinkLabel?: string;
  laneLinkOrphan?: boolean;
  isMutating?: boolean;
  onSaveLink?: (sceneId: string) => Promise<void>;
  onRemoveLink?: () => Promise<void>;
}

function laneHeight(expandedLane: number | null, laneIndex: number): number {
  return expandedLane === laneIndex
    ? LANE_UI.heightExpanded
    : LANE_UI.heightCompact;
}

function renderAddAudioMenu(
  addAudio: NonNullable<AudioClipLaneTracksProps["addAudio"]>,
  laneIndex: number,
  startSec: number,
  locked: boolean,
) {
  const generateBlockReason = addAudio.generateBlockReasonForLane?.(laneIndex);
  return (
    <AddAudioTimelineMenu
      laneIndex={laneIndex}
      startSec={startSec}
      disabled={addAudio.isBusy || locked}
      isRecording={addAudio.recordingLane === laneIndex}
      onRecord={addAudio.toggleRecord}
      onUpload={addAudio.triggerUpload}
      onGenerate={addAudio.addGenerated}
      generateDisabled={Boolean(generateBlockReason)}
      generateDisabledTitle={generateBlockReason}
      variant="compact"
    />
  );
}

export interface AudioClipLaneSidebarProps {
  fullWidth?: boolean;
  laneIndex: number;
  expanded: boolean;
  expandedLane: number | null;
  locked: boolean;
  character?: Character;
  addAudio?: AudioClipLaneTracksProps["addAudio"];
  scenes?: TimelineSceneRef[];
  currentTimeSec: number;
  onExpandedLaneChange?: (laneIndex: number | null) => void;
  onMuteChange: (laneIndex: number, mute: boolean) => void;
  onSoloChange: (laneIndex: number, solo: boolean) => void;
  onVolumeChange: (laneIndex: number, volume: number) => void;
  onPanChange: (laneIndex: number, pan: number) => void;
  onFxSlotChange: (
    laneIndex: number,
    slotIndex: number,
    presetId: string | null,
  ) => void;
  onFxChainEnabledChange: (laneIndex: number, enabled: boolean) => void;
  onRecordToggle?: (laneIndex: number) => void;
  onDeleteLane?: (laneIndex: number) => void;
  onAddMveTextBlock?: AudioClipLaneTracksProps["onAddMveTextBlock"];
  /** Resolved lane-link target scene id for this character lane. */
  linkedSceneId?: string;
  mveLaneLink?: MveLaneLinkControlProps;
  allClips?: AudioClip[];
  className?: string;
}

export function AudioClipLaneSidebar({
  fullWidth = false,
  laneIndex,
  expanded,
  expandedLane,
  locked,
  character,
  addAudio,
  scenes,
  currentTimeSec,
  onExpandedLaneChange,
  onMuteChange,
  onSoloChange,
  onVolumeChange,
  onPanChange,
  onFxSlotChange,
  onFxChainEnabledChange,
  onRecordToggle,
  onDeleteLane,
  onAddMveTextBlock,
  linkedSceneId,
  mveLaneLink,
  allClips,
  className,
}: AudioClipLaneSidebarProps) {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const laneType = getLaneType(laneIndex);
  const height = laneHeight(expandedLane, laneIndex);
  const isDialog = isCharacterDialogLane(laneIndex);

  const headerAddon = isDialog ? (
    <AddMveTextBlockButton
      laneIndex={laneIndex}
      character={character}
      disabled={(addAudio?.isBusy ?? false) || locked || !onAddMveTextBlock}
      scenes={scenes}
      linkedSceneId={linkedSceneId}
      onAddTextBlock={({ characterId, sceneId }) =>
        onAddMveTextBlock?.({
          laneIndex,
          characterId,
          sceneId,
          startSec: currentTimeSec,
        })
      }
    />
  ) : addAudio ? (
    renderAddAudioMenu(addAudio, laneIndex, currentTimeSec, locked)
  ) : undefined;

  const showLaneLink =
    isDialog &&
    mveLaneLink?.enabled &&
    Boolean(character) &&
    mveLaneLink.onSaveLink;

  return (
    <>
      <div
        className={cn(
          fullWidth ? "w-full min-w-0 max-w-full" : LANE_UI.mixerWidthClass,
          "border-b border-border overflow-hidden shrink-0 min-w-0",
          className,
        )}
        style={{ height: `${height}px` }}
        onDoubleClick={() =>
          onExpandedLaneChange?.(expanded ? null : laneIndex)
        }
        title="Doppelklick: Spur erweitern"
      >
        <TrackHeader
          laneIndex={laneIndex}
          trackType={laneType}
          character={character}
          displayLabel={
            isCharacterDialogLane(laneIndex) ? "Audio Dialog" : undefined
          }
          layout={expanded ? "expanded" : "compact"}
          state={{ mute: false, solo: false, volume: 1, pan: 0, meterPeak: 0 }}
          onMuteChange={onMuteChange}
          onSoloChange={onSoloChange}
          onVolumeChange={onVolumeChange}
          onPanChange={onPanChange}
          onFxSlotChange={onFxSlotChange}
          onFxChainEnabledChange={onFxChainEnabledChange}
          onRecordToggle={onRecordToggle}
          isRecording={addAudio?.recordingLane === laneIndex}
          onDeleteLane={onDeleteLane}
          onLinkClick={showLaneLink ? () => setLinkModalOpen(true) : undefined}
          linkActive={Boolean(mveLaneLink?.linkedSceneId)}
          linkWarning={mveLaneLink?.laneLinkOrphan}
          laneLinkLabel={mveLaneLink?.laneLinkLabel}
          headerAddon={headerAddon}
          className="rounded-none"
        />
      </div>
      {showLaneLink && character ? (
        <MveLaneLinkModal
          open={linkModalOpen}
          characterName={character.name}
          acts={mveLaneLink.acts ?? []}
          sequences={mveLaneLink.sequences ?? []}
          scenes={mveLaneLink.structureScenes ?? []}
          selectedSceneId={mveLaneLink.linkedSceneId ?? null}
          isBusy={mveLaneLink.isMutating}
          onCancel={() => setLinkModalOpen(false)}
          onConfirm={async (sceneId) => {
            await mveLaneLink.onSaveLink?.(sceneId);
            setLinkModalOpen(false);
          }}
          onRemove={
            mveLaneLink.linkedSceneId && mveLaneLink.onRemoveLink
              ? async () => {
                  await mveLaneLink.onRemoveLink?.();
                  setLinkModalOpen(false);
                }
              : undefined
          }
        />
      ) : null}
    </>
  );
}
