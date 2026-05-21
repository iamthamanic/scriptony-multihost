/**
 * Audio lane assignment (T32) — shared with scriptony-audio-story track/clip create.
 * Lane ranges must match src/lib/types LANE_SCHEMA.
 */

export type LaneClipLike = {
  laneIndex?: number;
  startSec: number;
  endSec: number;
  trackType?: string;
};

const LANE_RANGES: Record<string, { base: number; max: number }> = {
  dialog: { base: 0, max: 9 },
  sfx: { base: 10, max: 19 },
  music: { base: 20, max: 29 },
  atmo: { base: 30, max: 39 },
  narrator: { base: 40, max: 49 },
  global: { base: 90, max: 99 },
};

function hasClipOverlapOnLane(
  clips: LaneClipLike[],
  laneIndex: number,
  newClip: LaneClipLike,
): boolean {
  const laneClips = clips.filter((c) => (c.laneIndex ?? 0) === laneIndex);
  return laneClips.some(
    (c) => !(newClip.endSec <= c.startSec || newClip.startSec >= c.endSec),
  );
}

function findFreeLane(
  clips: LaneClipLike[],
  newClip: LaneClipLike,
  base: number,
  max: number,
): number {
  for (let lane = base; lane <= max; lane++) {
    if (!hasClipOverlapOnLane(clips, lane, newClip)) return lane;
  }
  return max;
}

/** First non-overlapping lane for track type; falls back to max lane if full. */
export function assignLaneIndex(
  clips: LaneClipLike[],
  newClip: LaneClipLike,
): number {
  const trackType = newClip.trackType || "dialog";
  const cfg = LANE_RANGES[trackType] ?? LANE_RANGES.dialog;
  return findFreeLane(clips, newClip, cfg.base, cfg.max);
}

/** Whether lane index lies in the allowed range for a track type. */
export function isLaneInRange(laneIndex: number, trackType: string): boolean {
  const cfg = LANE_RANGES[trackType] ?? LANE_RANGES.dialog;
  return (
    Number.isFinite(laneIndex) && laneIndex >= cfg.base && laneIndex <= cfg.max
  );
}

/**
 * Use client-provided lane when in-range and non-overlapping; otherwise auto-assign.
 */
export function resolveLaneIndexForTrack(
  requestedLane: number | undefined,
  trackType: string,
  existingClips: LaneClipLike[],
  newClip: LaneClipLike,
): number {
  if (
    typeof requestedLane === "number" &&
    isLaneInRange(requestedLane, trackType) &&
    !hasClipOverlapOnLane(existingClips, requestedLane, newClip)
  ) {
    return requestedLane;
  }
  return assignLaneIndex(existingClips, { ...newClip, trackType });
}
