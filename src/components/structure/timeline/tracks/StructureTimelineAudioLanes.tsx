/**
 * Audio DAW rows inside StructureTimelineEditor (labels column + scroll content).
 * Location: src/components/structure/timeline/tracks/StructureTimelineAudioLanes.tsx
 */

import { useState } from "react";
import { Plus } from "lucide-react";
import { useProjectClipLanes } from "../../../../hooks/useProjectClipLanes";
import { useTimelineAddAudio } from "../../../../hooks/useTimelineAddAudio";
import { LANE_UI } from "../../../../lib/audio-lane";
import { cn } from "../../../../lib/utils";
import {
  StructureTimelineClipLaneContent,
  StructureTimelineClipLaneLabels,
} from "./StructureTimelineClipLanes";

export interface StructureTimelineAudioLanesProps {
  projectId: string;
  projectType?: string;
  pxPerSec: number;
  viewStartSec: number;
  totalWidthPx: number;
  currentTimeSec: number;
}

export function useStructureTimelineAudioLanes(
  props: StructureTimelineAudioLanesProps,
) {
  const [expandedLane, setExpandedLane] = useState<number | null>(null);
  const lanes = useProjectClipLanes(props.projectId, props.projectType);
  const addAudio = useTimelineAddAudio({
    projectId: props.projectId,
    projectType: props.projectType,
    scenes: lanes.scenes,
    currentTimeSec: props.currentTimeSec,
    getCharacterIdForLane: lanes.characterLanes.characterIdForLane,
    allClips: lanes.allClips,
  });

  const laneProps = {
    pxPerSec: props.pxPerSec,
    viewStartSec: props.viewStartSec,
    totalWidthPx: props.totalWidthPx,
    laneGroups: lanes.laneGroups,
    sortedLaneIndices: lanes.sortedLaneIndices,
    allClips: lanes.allClips,
    laneState: lanes.laneState,
    handlers: lanes.handlers,
    currentTimeSec: props.currentTimeSec,
    expandedLane,
    onExpandedLaneChange: setExpandedLane,
    addAudio: {
      isBusy: addAudio.isBusy,
      recordingLane: addAudio.recordingLane,
      addGenerated: addAudio.addGenerated,
      triggerUpload: addAudio.triggerUpload,
      toggleRecord: addAudio.toggleRecord,
      addSfxLane: addAudio.addSfxLane,
    },
    characterLanes: {
      getCharacterForLane: lanes.characterLanes.getCharacterForLane,
      dialogLaneOrder: lanes.characterLanes.dialogLaneOrder,
      reorderCharacters: lanes.characterLanes.reorderCharacters,
      isReordering: lanes.characterLanes.isReordering,
      allClips: lanes.allClips,
    },
  };

  return { lanes, addAudio, laneProps };
}

/** Left column: mixer headers (below Scene label row). */
export function StructureTimelineAudioLaneLabels({
  laneProps,
  addAudio,
  isLoading,
}: {
  laneProps: ReturnType<typeof useStructureTimelineAudioLanes>["laneProps"];
  addAudio: ReturnType<typeof useStructureTimelineAudioLanes>["addAudio"];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="border-t-2 border-primary/30 px-2 py-2 text-[9px] text-muted-foreground">
        Audio…
      </div>
    );
  }

  return (
    <div className="border-t-2 border-primary/30 bg-muted/15 shrink-0">
      <input
        ref={addAudio.fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={addAudio.onFileInputChange}
      />
      <div
        className="border-b border-border px-2 py-1 flex items-center bg-card/80"
        style={{ minHeight: "1.75rem" }}
      >
        <span className="text-[9px] font-semibold text-foreground">
          Audio-Spuren
        </span>
      </div>
      <StructureTimelineClipLaneLabels {...laneProps} fullWidthSidebar />
      <div className="border-t border-border px-2 py-2 bg-card/80">
        <button
          type="button"
          disabled={addAudio.isBusy}
          onClick={() => void addAudio.addSfxLane()}
          className="flex items-center justify-center gap-1 w-full py-1 text-[10px] rounded border border-dashed border-orange-400/60 text-muted-foreground hover:text-foreground hover:bg-orange-500/10 disabled:opacity-50"
          aria-label="SFX-Spur hinzufügen"
        >
          <Plus className="size-3" />
          SFX
        </button>
      </div>
    </div>
  );
}

/** Scroll area: clip lanes aligned with structure timeline width. */
export function StructureTimelineAudioLaneScrollRows({
  laneProps,
  isLoading,
}: {
  laneProps: ReturnType<typeof useStructureTimelineAudioLanes>["laneProps"];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div
        className="border-t-2 border-primary/30 flex items-center px-3 text-xs text-muted-foreground"
        style={{ height: LANE_UI.heightCompact }}
      >
        Audio-Spuren werden geladen…
      </div>
    );
  }

  return (
    <div className="relative border-t-2 border-primary/30 shrink-0">
      <StructureTimelineClipLaneContent {...laneProps} />
    </div>
  );
}

/** Standalone stack (ClipAudioTimeline) — not used in Structure tab. */
export function StructureTimelineAudioLanesStack(
  props: StructureTimelineAudioLanesProps,
) {
  const { lanes, addAudio, laneProps } = useStructureTimelineAudioLanes(props);

  return (
    <div className={cn("flex shrink-0", LANE_UI.mixerWidthClass)}>
      <div className="flex flex-col w-[248px] shrink-0 border-r border-border">
        <StructureTimelineAudioLaneLabels
          laneProps={laneProps}
          addAudio={addAudio}
          isLoading={lanes.isLoading}
        />
      </div>
      <div
        className="flex-1 min-w-0 overflow-x-auto"
        style={{ width: props.totalWidthPx }}
      >
        <StructureTimelineAudioLaneScrollRows
          laneProps={laneProps}
          isLoading={lanes.isLoading}
        />
      </div>
    </div>
  );
}

/** @deprecated Use useStructureTimelineAudioLanes */
export const useVideoEditorTimelineAudioLanes = useStructureTimelineAudioLanes;

/** @deprecated Use StructureTimelineAudioLaneLabels */
export const VideoEditorTimelineAudioLaneLabels =
  StructureTimelineAudioLaneLabels;

/** @deprecated Use StructureTimelineAudioLaneScrollRows */
export const VideoEditorTimelineAudioLaneScrollRows =
  StructureTimelineAudioLaneScrollRows;

/** @deprecated Use StructureTimelineAudioLanesStack */
export const VideoEditorTimelineAudioLanesStack =
  StructureTimelineAudioLanesStack;

/** @deprecated Use StructureTimelineAudioLanesProps */
export type VideoEditorTimelineAudioLanesProps =
  StructureTimelineAudioLanesProps;
