/**
 * Structure timeline clip lane wrappers (label column + scroll content).
 * Location: src/components/structure/timeline/tracks/StructureTimelineClipLanes.tsx
 */

import {
  AudioClipLaneTracks,
  type AudioClipLaneHandlers,
} from "../../../timeline/audio/AudioClipLaneTracks";
import type { useAudioLaneState } from "../../../../hooks/useAudioLaneState";
import type { useTimelineAddAudio } from "../../../../hooks/useTimelineAddAudio";
import type { useCharacterLaneMap } from "../../../../hooks/useCharacterLaneMap";
import type { Act, AudioClip, Scene, Sequence } from "../../../../lib/types";
import type { TimelineSceneRef } from "../../../../lib/timeline-add-audio";
import type { MveLaneLinkControlProps } from "../../../timeline/audio/AudioClipLaneSidebar";

export interface StructureTimelineClipLanesBaseProps {
  pxPerSec: number;
  viewStartSec: number;
  totalWidthPx: number;
  scenes?: TimelineSceneRef[];
  acts?: Act[];
  sequences?: Sequence[];
  structureScenes?: Scene[];
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
  mveLines?: import("../../../timeline/audio/AudioClipLaneContent").MveLineClipHandlers;
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

export function StructureTimelineClipLaneLabels({
  fullWidthSidebar,
  ...props
}: StructureTimelineClipLanesBaseProps & { fullWidthSidebar?: boolean }) {
  return (
    <AudioClipLaneTracks
      {...props}
      labelMode="sidebar"
      fullWidthSidebar={fullWidthSidebar}
    />
  );
}

export function StructureTimelineClipLaneContent(
  props: StructureTimelineClipLanesBaseProps,
) {
  return <AudioClipLaneTracks {...props} labelMode="content-only" />;
}

/** @deprecated Use StructureTimelineClipLaneLabels */
export const VideoEditorTimelineClipLaneLabels =
  StructureTimelineClipLaneLabels;

/** @deprecated Use StructureTimelineClipLaneContent */
export const VideoEditorTimelineClipLaneContent =
  StructureTimelineClipLaneContent;

/** @deprecated Use StructureTimelineClipLanesBaseProps */
export type VideoEditorTimelineClipLanesBaseProps =
  StructureTimelineClipLanesBaseProps;
