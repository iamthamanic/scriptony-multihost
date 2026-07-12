/**
 * 🎬 TIMELINE HELPER FUNCTIONS
 * Extracted from VideoEditorTimeline for better maintainability
 */

import {
  gaplessRippleFromLeft,
  gaplessRippleFromRight,
  sortBeatsByStart,
} from "../lib/beats/beat-trim-commit";

export const MIN_BEAT_DURATION_SEC = 1;

export interface Beat {
  id: string;
  pct_from: number;
  pct_to: number;
  label?: string;
}

export interface TrimLeftResult {
  newPctFrom: number;
  rippleBeats: Beat[]; // 🆕 Beats that were pushed/pulled
}

export interface TrimRightResult {
  newPctTo: number;
  rippleBeats: Beat[]; // 🆕 Beats that were pushed/pulled
}

/**
 * 🧲 CapCut-Style Ripple: Trim beat from LEFT handle
 * Previous beats STICK to the start of current beat (gapless to the left)
 * while each beat keeps its own duration.
 */
export function trimBeatLeft(
  beat: Beat,
  beats: Beat[],
  newSec: number,
  duration: number,
  beatMagnetEnabled: boolean,
  snapTime: (
    time: number,
    beats: Beat[],
    duration: number,
    pxPerSec: number,
    options?: { excludeBeatId?: string; snapToPlayheadSec?: number },
  ) => number,
  pxPerSec: number,
  currentTimeRef: number,
): TrimLeftResult {
  const beatEndSec = (beat.pct_to / 100) * duration;

  // Clamp to min duration and bounds
  let clampedSec = Math.max(
    0,
    Math.min(beatEndSec - MIN_BEAT_DURATION_SEC, newSec),
  );

  // 🧲 SNAP (if magnet enabled)
  if (beatMagnetEnabled) {
    clampedSec = snapTime(clampedSec, beats, duration, pxPerSec, {
      excludeBeatId: beat.id,
      snapToPlayheadSec: currentTimeRef,
    });
  }

  // Enforce min duration again after snapping
  clampedSec = Math.min(beatEndSec - MIN_BEAT_DURATION_SEC, clampedSec);
  const newPctFrom = (clampedSec / duration) * 100;

  const sortedBeats = sortBeatsByStart(beats);
  const beatIndex = sortedBeats.findIndex((b) => b.id === beat.id);
  const rippleBeats =
    beatIndex > 0
      ? gaplessRippleFromLeft(sortedBeats, beatIndex, newPctFrom)
      : [];

  return { newPctFrom, rippleBeats };
}

/**
 * 🧲 CapCut-Style Ripple: Trim beat from RIGHT handle
 * Next beat STICKS to the end of current beat (gapless)
 * All subsequent beats shift to maintain their relative spacing
 */
export function trimBeatRight(
  beat: Beat,
  beats: Beat[],
  newSec: number,
  duration: number,
  beatMagnetEnabled: boolean,
  snapTime: (
    time: number,
    beats: Beat[],
    duration: number,
    pxPerSec: number,
    options?: { excludeBeatId?: string; snapToPlayheadSec?: number },
  ) => number,
  pxPerSec: number,
  currentTimeRef: number,
): TrimRightResult {
  const beatStartSec = (beat.pct_from / 100) * duration;
  const oldEndSec = (beat.pct_to / 100) * duration;

  // Clamp to min duration and bounds
  let clampedSec = Math.max(
    beatStartSec + MIN_BEAT_DURATION_SEC,
    Math.min(duration, newSec),
  );

  // 🧲 SNAP (if magnet enabled)
  if (beatMagnetEnabled) {
    clampedSec = snapTime(clampedSec, beats, duration, pxPerSec, {
      excludeBeatId: beat.id,
      snapToPlayheadSec: currentTimeRef,
    });
  }

  // Enforce min duration again after snapping
  clampedSec = Math.max(beatStartSec + MIN_BEAT_DURATION_SEC, clampedSec);

  const newPctTo = (clampedSec / duration) * 100;

  const sortedBeats = sortBeatsByStart(beats);
  const beatIndex = sortedBeats.findIndex((b) => b.id === beat.id);
  const rippleBeats =
    beatIndex >= 0 && beatIndex < sortedBeats.length - 1
      ? gaplessRippleFromRight(sortedBeats, beatIndex, newPctTo)
      : [];

  return { newPctTo, rippleBeats };
}
