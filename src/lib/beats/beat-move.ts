/**
 * Beat-lane body move — flat reorder with gapless repack (CapCut-style).
 * Location: src/lib/beats/beat-move.ts
 */

import type { Beat } from "../../components/timeline-helpers";
import { packBeatsGapless, sortBeatsByStart } from "./beat-trim-commit";

export interface BeatMoveInsertionSlot {
  insertIndex: number;
  /** Junction in seconds on the beat lane timeline. */
  boundarySec: number;
  wouldChange: boolean;
}

export function computeBeatBlockInsertIndex(
  others: Beat[],
  anchorCenterSec: number,
  durationSec: number,
): number {
  let insertIdx = 0;
  for (const sibling of others) {
    const midSec = ((sibling.pct_from + sibling.pct_to) / 200) * durationSec;
    if (anchorCenterSec > midSec) insertIdx++;
  }
  return insertIdx;
}

export function computeBeatReorderInsertIndex(
  sorted: Beat[],
  beatId: string,
  deltaSec: number,
  durationSec: number,
): number {
  const item = sorted.find((b) => b.id === beatId);
  if (!item || durationSec <= 0) return 0;

  const startSec = (item.pct_from / 100) * durationSec;
  const endSec = (item.pct_to / 100) * durationSec;
  const centerSec = (startSec + endSec) / 2 + deltaSec;
  const others = sorted.filter((b) => b.id !== beatId);
  return computeBeatBlockInsertIndex(others, centerSec, durationSec);
}

export function getBeatMoveInsertionSlot(input: {
  snapshot: Beat[];
  beatId: string;
  deltaSec: number;
  durationSec: number;
}): BeatMoveInsertionSlot | null {
  const sorted = sortBeatsByStart(input.snapshot);
  const item = sorted.find((b) => b.id === input.beatId);
  if (!item || sorted.length < 2) return null;

  const insertIndex = computeBeatReorderInsertIndex(
    sorted,
    input.beatId,
    input.deltaSec,
    input.durationSec,
  );
  const others = sorted.filter((b) => b.id !== input.beatId);
  const reordered = [
    ...others.slice(0, insertIndex),
    item,
    ...others.slice(insertIndex),
  ];
  const wouldChange = !reordered.every(
    (beat, index) => beat.id === sorted[index]!.id,
  );

  let boundarySec = 0;
  if (insertIndex > 0) {
    const prev = others[insertIndex - 1]!;
    boundarySec = (prev.pct_to / 100) * input.durationSec;
  }

  return { insertIndex, boundarySec, wouldChange };
}

export function commitBeatReorder(
  snapshot: Beat[],
  beatId: string,
  insertIndex: number,
) {
  const sorted = sortBeatsByStart(snapshot);
  const item = sorted.find((b) => b.id === beatId);
  if (!item) {
    return { beats: snapshot, durationScale: 1 };
  }

  const others = sorted.filter((b) => b.id !== beatId);
  const clampedIdx = Math.max(0, Math.min(insertIndex, others.length));
  const reordered = [
    ...others.slice(0, clampedIdx),
    item,
    ...others.slice(clampedIdx),
  ];
  return packBeatsGapless(reordered);
}

export function getBeatGroupMoveInsertionSlot(input: {
  snapshot: Beat[];
  selectedIds: string[];
  anchorBeatId: string;
  deltaSec: number;
  durationSec: number;
}): BeatMoveInsertionSlot | null {
  const sorted = sortBeatsByStart(input.snapshot);
  const selectedSet = new Set(input.selectedIds);
  const block = sorted.filter((b) => selectedSet.has(b.id));
  if (block.length < 2) return null;

  const anchor = block.find((b) => b.id === input.anchorBeatId);
  if (!anchor || input.durationSec <= 0) return null;

  const others = sorted.filter((b) => !selectedSet.has(b.id));
  const startSec = (anchor.pct_from / 100) * input.durationSec;
  const endSec = (anchor.pct_to / 100) * input.durationSec;
  const anchorCenterSec = (startSec + endSec) / 2 + input.deltaSec;
  const insertIndex = computeBeatBlockInsertIndex(
    others,
    anchorCenterSec,
    input.durationSec,
  );

  const reordered = [
    ...others.slice(0, insertIndex),
    ...block,
    ...others.slice(insertIndex),
  ];
  const wouldChange = !reordered.every(
    (beat, index) => beat.id === sorted[index]!.id,
  );

  let boundarySec = 0;
  if (insertIndex > 0) {
    const prev = others[insertIndex - 1]!;
    boundarySec = (prev.pct_to / 100) * input.durationSec;
  }

  return { insertIndex, boundarySec, wouldChange };
}

export function commitBeatGroupReorder(
  snapshot: Beat[],
  selectedIds: string[],
  insertIndex: number,
) {
  const sorted = sortBeatsByStart(snapshot);
  const selectedSet = new Set(selectedIds);
  const block = sorted.filter((b) => selectedSet.has(b.id));
  const others = sorted.filter((b) => !selectedSet.has(b.id));
  const clampedIdx = Math.max(0, Math.min(insertIndex, others.length));
  const reordered = [
    ...others.slice(0, clampedIdx),
    ...block,
    ...others.slice(clampedIdx),
  ];
  return packBeatsGapless(reordered);
}
