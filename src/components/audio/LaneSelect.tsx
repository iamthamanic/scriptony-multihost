/**
 * LaneSelect — T32 DAW Feature.
 *
 * Dropdown for manual lane assignment within a track type.
 * Shows available lanes (e.g. "SFX-Spur 1" – "SFX-Spur 10")
 * and marks lanes with overlap conflicts (⚠).
 *
 * WCAG 2.2 AA: keyboard accessible, labelled.
 */

import { getLaneLabel, hasOverlap } from "../../lib/audio-lane";
import { LANE_SCHEMA } from "../../lib/types";
import type { AudioClip, AudioTrackType } from "../../lib/types";
import { cn } from "../../lib/utils";

export interface LaneSelectProps {
  currentLaneIndex: number;
  trackType: AudioTrackType | "global";
  /** All clips in the scene (for overlap detection). */
  clips: AudioClip[];
  /** The clip being moved (excluded from overlap check). */
  clipId: string;
  clipStartSec: number;
  clipEndSec: number;
  onChange: (newLaneIndex: number) => void;
  className?: string;
}

export function LaneSelect({
  currentLaneIndex,
  trackType,
  clips,
  clipId,
  clipStartSec,
  clipEndSec,
  onChange,
  className,
}: LaneSelectProps) {
  const config = LANE_SCHEMA[trackType as keyof typeof LANE_SCHEMA];
  if (!config) return null;

  const { base, max } = config;
  const lanes: number[] = [];
  for (let i = base; i <= max; i++) lanes.push(i);

  return (
    <select
      value={currentLaneIndex}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(
        "text-xs bg-muted border border-border rounded px-1.5 py-0.5 text-foreground",
        "focus:outline-none focus:ring-1 focus:ring-ring",
        className,
      )}
      aria-label={`Lane für ${config.label} wählen`}
    >
      {lanes.map((laneIdx) => {
        const overlap = hasOverlap(
          clips,
          { startSec: clipStartSec, endSec: clipEndSec, id: clipId },
          laneIdx,
        );
        const label = getLaneLabel(laneIdx);
        return (
          <option key={laneIdx} value={laneIdx}>
            {overlap ? `${label} ⚠` : label}
          </option>
        );
      })}
    </select>
  );
}
