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

export interface AudioClipLaneContentProps {
  laneIndex: number;
  height: number;
  totalWidthPx: number;
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
    "getCharacterForLane" | "dialogLaneOrder"
  >;
  className?: string;
}

export function AudioClipLaneContent({
  laneIndex,
  height,
  totalWidthPx,
  clips,
  pxPerSec,
  viewStartSec,
  laneState,
  onTrimEnd,
  onLaneChange,
  onGenerateTts,
  allClips = [],
  characterLanes,
  className,
}: AudioClipLaneContentProps) {
  const audible = isLaneAudible(laneIndex, laneState.laneStates);

  return (
    <div
      className={cn(
        "relative border-b border-border bg-muted/10 shrink-0",
        !audible && "opacity-30",
        className,
      )}
      style={{ height: `${height}px`, width: `${totalWidthPx}px` }}
    >
      {clips.map((clip) => (
        <AudioTimelineSegment
          key={clip.id}
          item={clip}
          pxPerSec={pxPerSec}
          
          onTrimEnd={onTrimEnd}
          isEditable={!(laneState.getLaneState(laneIndex)?.locked ?? false)}
          onGenerateTts={() => onGenerateTts(clip)}
          allClips={allClips}
          onLaneChange={onLaneChange}
          
          
        />
      ))}
    </div>
  );
}
