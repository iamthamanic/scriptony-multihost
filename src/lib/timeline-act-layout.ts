/**
 * Film timeline: resolve act global spans from metadata without overlapping blocks.
 * Location: src/lib/timeline-act-layout.ts
 */

import {
  packSequentialSpanGaps,
  readRawPctSpans,
  rawSpansHaveImplicitGapPct,
  rawSpansHaveLayoutIssues,
  rawSpansHaveOverlappingPct,
  PACK_EPS,
} from "./timeline-tree/pack";

export interface ActLike {
  id: string;
  orderIndex?: number;
  actNumber?: number;
  metadata?: { pct_from?: number; pct_to?: number };
}

export interface ActGlobalSpan {
  startSec: number;
  endSec: number;
}

const EPS = PACK_EPS;

export function sortActsByOrder(acts: ActLike[]): ActLike[] {
  return [...acts].sort((a, b) => {
    const oa = a.orderIndex ?? a.actNumber ?? 0;
    const ob = b.orderIndex ?? b.actNumber ?? 0;
    return oa - ob;
  });
}

/** Read pct spans in act order; de-overlap or fall back to equal rows. */
export function resolveFilmActGlobalSpans(
  acts: ActLike[],
  duration: number,
): Map<string, ActGlobalSpan> {
  const sorted = sortActsByOrder(acts);
  const n = sorted.length || 1;
  const total = Math.max(EPS, duration);
  const minSpan = Math.max(EPS, total * 0.002);

  const raw: Array<{ id: string; start: number; end: number }> = [];
  for (let i = 0; i < sorted.length; i++) {
    const act = sorted[i];
    const meta = act.metadata ?? {};
    let from = meta.pct_from;
    let to = meta.pct_to;
    const valid =
      typeof from === "number" &&
      typeof to === "number" &&
      Number.isFinite(from) &&
      Number.isFinite(to) &&
      from < to;
    const fromPct = valid ? from! : (i / n) * 100;
    const toPct = valid ? to! : ((i + 1) / n) * 100;
    raw.push({
      id: act.id,
      start: (fromPct / 100) * total,
      end: (toPct / 100) * total,
    });
  }

  packSequentialSpanGaps(raw);

  let broken = false;
  for (const r of raw) {
    if (r.end - r.start < minSpan) broken = true;
  }
  for (let i = 1; i < raw.length; i++) {
    if (raw[i].start < raw[i - 1].end - EPS) broken = true;
  }

  const out = new Map<string, ActGlobalSpan>();

  if (!broken) {
    for (const r of raw) {
      out.set(r.id, { startSec: r.start, endSec: r.end });
    }
    return out;
  }

  if (raw.length <= 1) {
    for (const r of raw) {
      out.set(r.id, {
        startSec: 0,
        endSec: Math.max(minSpan, Math.min(total, r.end)),
      });
    }
    return out;
  }

  const fixed = [...raw];
  for (let i = 1; i < fixed.length; i++) {
    if (fixed[i].start < fixed[i - 1].end - EPS) {
      const prevEnd = fixed[i - 1].end;
      const dur = Math.max(minSpan, fixed[i].end - fixed[i].start);
      fixed[i].start = prevEnd;
      fixed[i].end = Math.min(total, prevEnd + dur);
    }
  }

  let stillBroken = false;
  for (let i = 1; i < fixed.length; i++) {
    if (fixed[i].start < fixed[i - 1].end - EPS) stillBroken = true;
  }
  for (const r of fixed) {
    if (r.end - r.start < minSpan) stillBroken = true;
  }

  if (!stillBroken) {
    packSequentialSpanGaps(fixed);
    for (const r of fixed) {
      out.set(r.id, { startSec: r.start, endSec: r.end });
    }
    return out;
  }

  for (let i = 0; i < sorted.length; i++) {
    out.set(sorted[i].id, {
      startSec: (i / n) * total,
      endSec: ((i + 1) / n) * total,
    });
  }
  return out;
}

/** Write resolved global spans back to act metadata.pct_* (timeline percent). */
export function applyResolvedActPctToActs<T extends ActLike>(
  acts: T[],
  duration: number,
): T[] {
  const spans = resolveFilmActGlobalSpans(acts, duration);
  const total = Math.max(1e-9, duration);
  return acts.map((act) => {
    const s = spans.get(act.id);
    if (!s) return act;
    return {
      ...act,
      metadata: {
        ...(act.metadata ?? {}),
        pct_from: (s.startSec / total) * 100,
        pct_to: (s.endSec / total) * 100,
      },
    } as T;
  });
}

function actRawPctSpans(acts: ActLike[], duration: number) {
  const sorted = sortActsByOrder(acts);
  return readRawPctSpans(sorted, Math.max(EPS, duration)).map(
    ({ start, end }) => ({ start, end }),
  );
}

/** True when stored act pct leaves implicit gaps between siblings. */
export function actsHaveRawImplicitGapPct(
  acts: ActLike[],
  duration: number,
): boolean {
  return rawSpansHaveImplicitGapPct(actRawPctSpans(acts, duration), EPS);
}

/** True when stored metadata pct would overlap on the timeline (before resolve). */
export function actsHaveRawOverlappingPct(
  acts: ActLike[],
  duration: number,
): boolean {
  const total = Math.max(EPS, duration);
  const minSpan = Math.max(EPS, total * 0.002);
  return rawSpansHaveOverlappingPct(
    actRawPctSpans(acts, duration),
    minSpan,
    EPS,
  );
}

/** One row per act id (first wins by orderIndex / actNumber). */
export function dedupeActsById<T extends ActLike>(acts: T[]): T[] {
  const sorted = sortActsByOrder(acts) as T[];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const a of sorted) {
    if (!a.id || seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  return out;
}

export function withFilmActsPctResolved<T extends { acts?: ActLike[] }>(
  data: T,
  duration: number,
): T {
  const acts = dedupeActsById(data.acts || []);
  if (!acts.length) return data;
  return {
    ...data,
    acts: applyResolvedActPctToActs(acts, duration),
  };
}

export function actsHaveRawFilmLayoutIssues(
  acts: ActLike[],
  duration: number,
): boolean {
  const total = Math.max(EPS, duration);
  const minSpan = Math.max(EPS, total * 0.002);
  return rawSpansHaveLayoutIssues(actRawPctSpans(acts, duration), minSpan, EPS);
}

export function actsHaveOverlappingFilmPct(
  acts: ActLike[],
  duration: number,
): boolean {
  const sorted = sortActsByOrder(acts);
  const spans = resolveFilmActGlobalSpans(sorted, duration);
  const ordered = sorted
    .map((a) => spans.get(a.id))
    .filter(Boolean) as ActGlobalSpan[];
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i].startSec < ordered[i - 1].endSec - EPS) return true;
  }
  return false;
}
