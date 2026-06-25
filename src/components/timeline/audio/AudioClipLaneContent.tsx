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

export interface MveLineClipHandlers {
  projectId: string;
  lineByClipId: Map<string, MveLine>;
  onSaveText: (lineId: string, text: string) => Promise<void>;
  onSaveDirection: (
    lineId: string,
    direction: MveLineDirection,
  ) => Promise<void>;
  getRenderBlockReason?: (line: MveLine) => string | undefined;
  onRenderLine?: (lineId: string) => Promise<unknown>;
  isRenderingLineId?: string | null;
}

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
  mveLines?: MveLineClipHandlers;
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
  mveLines,
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
          viewStartSec={viewStartSec}
          onTrimEnd={onTrimEnd}
          isEditable={!(laneState.getLaneState(laneIndex)?.locked ?? false)}
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
    </div>
  );
}
