/**
 * Beat-lane trim commit — gapless ripple + timeline grow when pct exceeds 100%.
 * Location: src/lib/beats/beat-trim-commit.ts
 */

import type { Beat } from "../../components/timeline-helpers";

export interface BeatTrimCommitInput {
  snapshot: Beat[];
  beatId: string;
  handle: "left" | "right";
  trimmedBeat: { pct_from: number; pct_to: number };
}

export interface BeatTrimCommitResult {
  beats: Beat[];
  /** >1 when pct timeline exceeded 100% and duration should grow. */
  durationScale: number;
}

export function sortBeatsByStart(beats: Beat[]): Beat[] {
  return [...beats].sort((a, b) => a.pct_from - b.pct_from);
}

/** Gapless pack: all beats to the right of beatIndex stick to newPctTo. */
export function gaplessRippleFromRight(
  sorted: Beat[],
  beatIndex: number,
  newPctTo: number,
): Beat[] {
  const out: Beat[] = [];
  let currentEndPct = newPctTo;
  for (let i = beatIndex + 1; i < sorted.length; i++) {
    const b = sorted[i];
    const beatDurationPct = b.pct_to - b.pct_from;
    const pct_from = currentEndPct;
    const pct_to = currentEndPct + beatDurationPct;
    out.push({ ...b, pct_from, pct_to });
    currentEndPct = pct_to;
  }
  return out;
}

/** Gapless pack: all beats to the left of beatIndex stick to newPctFrom. */
export function gaplessRippleFromLeft(
  sorted: Beat[],
  beatIndex: number,
  newPctFrom: number,
): Beat[] {
  const out: Beat[] = [];
  let currentFromPct = newPctFrom;
  for (let i = beatIndex - 1; i >= 0; i--) {
    const b = sorted[i];
    const beatDurationPct = b.pct_to - b.pct_from;
    const pct_to = currentFromPct;
    const pct_from = currentFromPct - beatDurationPct;
    out.push({ ...b, pct_from, pct_to });
    currentFromPct = pct_from;
  }
  return out;
}

/** Gapless pack in list order from 0% — shared by trim commit and body-move reorder. */
export function packBeatsGapless(beatsInOrder: Beat[]): BeatTrimCommitResult {
  let cursor = 0;
  const packed = beatsInOrder.map((b) => {
    const dur = Math.max(0, b.pct_to - b.pct_from);
    const next = { ...b, pct_from: cursor, pct_to: cursor + dur };
    cursor += dur;
    return next;
  });
  return normalizeBeatPctTimeline(packed);
}

function normalizeBeatPctTimeline(beats: Beat[]): BeatTrimCommitResult {
  if (beats.length === 0) {
    return { beats, durationScale: 1 };
  }

  let work = beats;
  const minFrom = Math.min(...work.map((b) => b.pct_from));
  if (minFrom < 0) {
    const shift = -minFrom;
    work = work.map((b) => ({
      ...b,
      pct_from: b.pct_from + shift,
      pct_to: b.pct_to + shift,
    }));
  }

  const maxTo = Math.max(...work.map((b) => b.pct_to));
  if (maxTo <= 100) {
    return { beats: sortBeatsByStart(work), durationScale: 1 };
  }

  const durationScale = maxTo / 100;
  return {
    durationScale,
    beats: sortBeatsByStart(
      work.map((b) => ({
        ...b,
        pct_from: b.pct_from / durationScale,
        pct_to: b.pct_to / durationScale,
      })),
    ),
  };
}

/** Single source for preview + commit — full gapless beat row after trim. */
export function commitBeatTrimPositions(
  input: BeatTrimCommitInput,
): BeatTrimCommitResult {
  const sorted = sortBeatsByStart(input.snapshot);
  const beatIndex = sorted.findIndex((b) => b.id === input.beatId);
  if (beatIndex < 0) {
    return { beats: input.snapshot, durationScale: 1 };
  }

  const byId = new Map(input.snapshot.map((b) => [b.id, { ...b }]));
  const target = byId.get(input.beatId);
  if (!target) {
    return { beats: input.snapshot, durationScale: 1 };
  }

  if (input.handle === "right") {
    byId.set(input.beatId, {
      ...target,
      pct_from: target.pct_from,
      pct_to: input.trimmedBeat.pct_to,
    });
    for (const rb of gaplessRippleFromRight(
      sorted,
      beatIndex,
      input.trimmedBeat.pct_to,
    )) {
      byId.set(rb.id, rb);
    }
  } else {
    byId.set(input.beatId, {
      ...target,
      pct_from: input.trimmedBeat.pct_from,
      pct_to: target.pct_to,
    });
    for (const rb of gaplessRippleFromLeft(
      sorted,
      beatIndex,
      input.trimmedBeat.pct_from,
    )) {
      byId.set(rb.id, rb);
    }
  }

  return normalizeBeatPctTimeline([...byId.values()]);
}
