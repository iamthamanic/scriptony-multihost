/**
 * VETILALORAPP — sequential span packing (shared by act layout + tree repair).
 * Location: src/lib/timeline-tree/pack.ts
 */

import type { ItemKind, TimelineTree } from "./types";
import { mutateItemFrames } from "./tree-utils";

export const PACK_EPS = 1e-3;

export interface OrderedPctSpan {
  start: number;
  end: number;
}

/** Close implicit gaps between ordered frame spans (mutates rows in place). */
export function packSequentialFrameGaps<
  T extends { startFrame: number; endFrame: number },
>(rows: T[], eps = PACK_EPS): void {
  const spans = rows.map((row) => ({
    start: row.startFrame,
    end: row.endFrame,
  }));
  packSequentialSpanGaps(spans, eps);
  rows.forEach((row, index) => {
    row.startFrame = spans[index]!.start;
    row.endFrame = spans[index]!.end;
  });
}
/** Close implicit gaps between ordered spans in seconds (preserve each span duration). */
export function packSequentialSpanGaps(
  spans: Array<{ start: number; end: number }>,
  eps = PACK_EPS,
): void {
  for (let i = 1; i < spans.length; i++) {
    const gap = spans[i].start - spans[i - 1].end;
    if (gap <= eps) continue;
    for (let j = i; j < spans.length; j++) {
      spans[j].start -= gap;
      spans[j].end -= gap;
    }
  }
}

export interface RawPctRow {
  metadata?: { pct_from?: number; pct_to?: number };
}

export interface IdentifiedPctRow extends RawPctRow {
  id: string;
}

export function readPctMetadata(row: RawPctRow | undefined): {
  from?: number;
  to?: number;
  valid: boolean;
} {
  const from = row?.metadata?.pct_from;
  const to = row?.metadata?.pct_to;
  const valid =
    typeof from === "number" &&
    typeof to === "number" &&
    Number.isFinite(from) &&
    Number.isFinite(to) &&
    from < to;
  return { from, to, valid };
}

/** Map stored relative pct → integer frames inside a parent shell. */
export function relativePctToFrames(
  parentStartFrame: number,
  parentDurationFrames: number,
  pctFrom: number,
  pctTo: number,
): { startFrame: number; endFrame: number } {
  const parentDur = Math.max(1, parentDurationFrames);
  return {
    startFrame: parentStartFrame + Math.round((pctFrom / 100) * parentDur),
    endFrame: parentStartFrame + Math.round((pctTo / 100) * parentDur),
  };
}

/** Map child frames → relative pct for legacy persistence. */
export function framesToRelativePct(
  parentStartFrame: number,
  parentDurationFrames: number,
  startFrame: number,
  endFrame: number,
): { pct_from: number; pct_to: number } {
  const parentDur = Math.max(1, parentDurationFrames);
  return {
    pct_from: ((startFrame - parentStartFrame) / parentDur) * 100,
    pct_to: ((endFrame - parentStartFrame) / parentDur) * 100,
  };
}

/** Map act frames → project-relative pct. */
export function framesToProjectPct(
  projectDurationFrames: number,
  startFrame: number,
  endFrame: number,
): { pct_from: number; pct_to: number } {
  const total = Math.max(1, projectDurationFrames);
  return {
    pct_from: (startFrame / total) * 100,
    pct_to: (endFrame / total) * 100,
  };
}

export function metadataPctChanged(
  before: IdentifiedPctRow,
  after: IdentifiedPctRow,
  eps = 0.05,
): boolean {
  const b = readPctMetadata(before);
  const a = readPctMetadata(after);
  if (!b.valid && !a.valid) return false;
  if (!b.valid || !a.valid) return true;
  return Math.abs(b.from! - a.from!) > eps || Math.abs(b.to! - a.to!) > eps;
}

/** Ordered sibling spans from stored pct metadata (seconds). */
export function readRawPctSpans(
  rows: IdentifiedPctRow[],
  parentSpanSec: number,
): Array<{ id: string; start: number; end: number; valid: boolean }> {
  const total = Math.max(PACK_EPS, parentSpanSec);
  const n = rows.length || 1;

  return rows.map((row, i) => {
    const { valid, from, to } = readPctMetadata(row);
    if (!valid) {
      return {
        id: row.id,
        start: (i / n) * total,
        end: ((i + 1) / n) * total,
        valid: false,
      };
    }
    return {
      id: row.id,
      start: (from! / 100) * total,
      end: (to! / 100) * total,
      valid: true,
    };
  });
}

/** Collect ordered sibling spans from stored pct metadata (seconds). */
export function collectOrderedRawPctSpans(
  rows: RawPctRow[],
  parentSpanSec: number,
): OrderedPctSpan[] {
  return readRawPctSpans(
    rows.map((row, index) => ({
      id: String(index),
      ...row,
    })),
    parentSpanSec,
  ).map(({ start, end }) => ({ start, end }));
}

export function rawSpansHaveOverlappingPct(
  spans: OrderedPctSpan[],
  minSpanSec: number,
  eps = PACK_EPS,
): boolean {
  for (const r of spans) {
    if (r.end - r.start < minSpanSec) return true;
  }
  for (let i = 1; i < spans.length; i++) {
    if (spans[i].start < spans[i - 1].end - eps) return true;
  }
  return false;
}

export function rawSpansHaveImplicitGapPct(
  spans: OrderedPctSpan[],
  eps = PACK_EPS,
): boolean {
  for (let i = 1; i < spans.length; i++) {
    if (spans[i].start - spans[i - 1].end > eps) return true;
  }
  return false;
}

export function rawSpansHaveLayoutIssues(
  spans: OrderedPctSpan[],
  minSpanSec: number,
  eps = PACK_EPS,
): boolean {
  return (
    rawSpansHaveOverlappingPct(spans, minSpanSec, eps) ||
    rawSpansHaveImplicitGapPct(spans, eps)
  );
}

function parentShellDepthRank(kind: ItemKind): number {
  switch (kind) {
    case "shot":
      return 4;
    case "scene":
      return 3;
    case "sequence":
      return 2;
    case "act":
      return 1;
    default:
      return 0;
  }
}

/** Expand each parent shell to the hull of its children (no ripple). */
export function fitParentShellsToChildHull(tree: TimelineTree): void {
  for (let pass = 0; pass < 8; pass++) {
    let anyChange = false;
    const items = [...tree.items.values()].sort(
      (a, b) => parentShellDepthRank(b.kind) - parentShellDepthRank(a.kind),
    );
    for (const item of items) {
      if (item.parentId === null) continue;
      const parent = tree.items.get(item.parentId);
      if (!parent) continue;

      if (item.endFrame > parent.endFrame) {
        mutateItemFrames(parent, parent.startFrame, item.endFrame);
        anyChange = true;
      }
      if (item.startFrame < parent.startFrame) {
        mutateItemFrames(parent, item.startFrame, parent.endFrame);
        anyChange = true;
      }
    }
    if (!anyChange) break;
  }
}
