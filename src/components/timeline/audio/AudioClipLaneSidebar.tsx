/**
 * AudioClipLaneSidebar — sidebar label column for DAW lanes.
 * Extracted from AudioClipLaneTracks.tsx (T26).
 */

import { cn } from "../../../lib/utils";
import {
  getLaneType,
  LANE_UI,
} from "../../../lib/audio-lane";
import { isCharacterDialogLane } from "../../../lib/character-lane-map";
import { TrackHeader } from "../../audio/TrackHeader";
import { AddAudioTimelineMenu } from "./AddAudioTimelineMenu";
import type { AudioClip, Character } from "../../../lib/types";
import type { AudioClipLaneTracksProps } from "./AudioClipLaneTracks";

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
  return (
    <AddAudioTimelineMenu
      laneIndex={laneIndex}
      startSec={startSec}
      disabled={addAudio.isBusy || locked}
      isRecording={addAudio.recordingLane === laneIndex}
      onRecord={addAudio.toggleRecord}
      onUpload={addAudio.triggerUpload}
      onGenerate={addAudio.addGenerated}
      variant="compact"
    />
  );
}

export interface AudioClipLaneSidebarProps {
  laneIndex: number;
  expanded: boolean;
  expandedLane: number | null;
  locked: boolean;
  character?: Character;
  addAudio?: AudioClipLaneTracksProps["addAudio"];
  currentTimeSec: number;
  onExpandedLaneChange?: (laneIndex: number | null) => void;
  onMuteChange: (laneIndex: number, mute: boolean) => void;
  onSoloChange: (laneIndex: number, solo: boolean) => void;
  onVolumeChange: (laneIndex: number, volume: number) => void;
  onPanChange: (laneIndex: number, pan: number) => void;
  onFxSlotChange: (laneIndex: number, slotIndex: number, presetId: string | null) => void;
  onFxChainEnabledChange: (laneIndex: number, enabled: boolean) => void;
  onRecordToggle?: (laneIndex: number) => void;
  onDeleteLane?: (laneIndex: number) => void;
  allClips?: AudioClip[];
  className?: string;
}

export function AudioClipLaneSidebar({
  laneIndex,
  expanded,
  expandedLane,
  locked,
  character,
  addAudio,
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
  allClips,
  className,
}: AudioClipLaneSidebarProps) {
  const laneType = getLaneType(laneIndex);
  const height = laneHeight(expandedLane, laneIndex);

  return (
    <div
      className={cn(
        LANE_UI.mixerWidthClass,
        "border-b border-border overflow-hidden shrink-0 min-w-0",
        className,
      )}
      style={{ height: `${height}px` }}
      onDoubleClick={() => onExpandedLaneChange?.(expanded ? null : laneIndex)}
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
        headerAddon={
          addAudio
            ? renderAddAudioMenu(addAudio, laneIndex, currentTimeSec, locked)
            : undefined
        }
        className="rounded-none"
      />
    </div>
  );
}
