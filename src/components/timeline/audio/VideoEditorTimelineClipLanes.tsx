/**
 * VideoEditorTimelineClipLanes — thin wrappers for VET label column + scroll content.
 */

import {
  AudioClipLaneTracks,
  type AudioClipLaneHandlers,
} from "./AudioClipLaneTracks";
import type { useAudioLaneState } from "../../../hooks/useAudioLaneState";
import type { useTimelineAddAudio } from "../../../hooks/useTimelineAddAudio";
import type { useCharacterLaneMap } from "../../../hooks/useCharacterLaneMap";
import type { AudioClip } from "../../../lib/types";

export interface VideoEditorTimelineClipLanesBaseProps {
  pxPerSec: number;
  viewStartSec: number;
  totalWidthPx: number;
  laneGroups: Record<number, AudioClip[]>;
  sortedLaneIndices: number[];
  allClips?: AudioClip[];
  laneState: ReturnType<typeof useAudioLaneState>;
  handlers: AudioClipLaneHandlers;
  currentTimeSec?: number;
  expandedLane?: number | null;
  onExpandedLaneChange?: (laneIndex: number | null) => void;
  addAudio?: Pick<
    ReturnType<typeof useTimelineAddAudio>,
    | "isBusy"
    | "recordingLane"
    | "addGenerated"
    | "triggerUpload"
    | "toggleRecord"
    | "addSfxLane"
  >;
  characterLanes?: Pick<
    ReturnType<typeof useCharacterLaneMap>,
    | "getCharacterForLane"
    | "dialogLaneOrder"
    | "reorderCharacters"
    | "isReordering"
  > & { allClips?: AudioClip[] };
}

export function VideoEditorTimelineClipLaneLabels(
  props: VideoEditorTimelineClipLanesBaseProps,
) {
  return <AudioClipLaneTracks {...props} labelMode="sidebar" />;
}

export function VideoEditorTimelineClipLaneContent(
  props: VideoEditorTimelineClipLanesBaseProps,
) {
  return <AudioClipLaneTracks {...props} labelMode="content-only" />;
}
