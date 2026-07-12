/**
 * VETILALORAPP — scope-aware magnetic snap for structure trim.
 * Location: src/lib/ripple-engine/snap.ts
 */

import type {
  ItemKind,
  TimelineItem,
  TimelineTree,
  TrimSide,
} from "../timeline-tree/types";
import { getSortedSiblings } from "../timeline-tree/tree-utils";

type SiblingSnapCtx = {
  item: TimelineItem;
  siblings: TimelineItem[];
  idx: number;
};

/** Packed junction (pred.end === item.start) must not magnet-cancel the gesture. */
function addPredecessorSnapEdges(
  edges: Set<number>,
  { item, siblings, idx }: SiblingSnapCtx,
): void {
  if (idx <= 0) return;
  const pred = siblings[idx - 1]!;
  edges.add(pred.startFrame);
  if (pred.endFrame !== item.startFrame) edges.add(pred.endFrame);
}

function addSuccessorSnapEdges(
  edges: Set<number>,
  { item, siblings, idx }: SiblingSnapCtx,
): void {
  if (idx < 0 || idx >= siblings.length - 1) return;
  const nextSib = siblings[idx + 1]!;
  if (nextSib.startFrame !== item.endFrame) edges.add(nextSib.startFrame);
  edges.add(nextSib.endFrame);
}

function siblingSnapCtx(
  tree: TimelineTree,
  itemId: string,
): SiblingSnapCtx | null {
  const item = tree.items.get(itemId);
  if (!item) return null;
  const siblings = getSortedSiblings(tree, item.parentId);
  const idx = siblings.findIndex((s) => s.id === itemId);
  return { item, siblings, idx };
}

/** Moving boundary / drop frame must never snap back to the gesture anchor. */
function addPlayheadSnapEdge(
  edges: Set<number>,
  playheadFrame: number | undefined,
  excludeAnchors: Set<number>,
): void {
  if (typeof playheadFrame !== "number") return;
  if (excludeAnchors.has(playheadFrame)) return;
  edges.add(playheadFrame);
}

function addFrameGridSnapEdges(
  edges: Set<number>,
  item: TimelineItem,
  frameRate: number,
  excludeAnchors: Set<number>,
): void {
  const step = frameRate;
  const lo = item.startFrame - step * 4;
  const hi = item.endFrame + step * 4;
  for (let f = lo; f <= hi; f += step) {
    if (!excludeAnchors.has(f)) edges.add(f);
  }
}

export interface SnapEdgesInput {
  tree: TimelineTree;
  itemId: string;
  kind: ItemKind;
  side: TrimSide;
  playheadFrame?: number;
  markerFrames?: number[];
  includeFrameGrid?: boolean;
}

export function getSnapEdgesForStructureOperation(
  input: SnapEdgesInput,
): number[] {
  const ctx = siblingSnapCtx(input.tree, input.itemId);
  if (!ctx) return [];

  const { item } = ctx;
  const edges = new Set<number>();

  if (input.side === "left") {
    addPredecessorSnapEdges(edges, ctx);
    const parent = item.parentId ? input.tree.items.get(item.parentId) : null;
    if (parent) edges.add(parent.startFrame);
  } else {
    addSuccessorSnapEdges(edges, ctx);
    const parent = item.parentId ? input.tree.items.get(item.parentId) : null;
    if (parent) edges.add(parent.endFrame);
    edges.add(input.tree.projectDurationFrames);
  }

  const anchorFrame = input.side === "left" ? item.startFrame : item.endFrame;
  const excludeAnchors = new Set([anchorFrame]);

  addPlayheadSnapEdge(edges, input.playheadFrame, excludeAnchors);
  for (const m of input.markerFrames ?? []) {
    if (!excludeAnchors.has(m)) edges.add(m);
  }

  if (input.includeFrameGrid && input.tree.frameRate > 0) {
    addFrameGridSnapEdges(edges, item, input.tree.frameRate, excludeAnchors);
  }

  return [...edges];
}

/** @deprecated Body-move uses center snap in structure-move-gesture.ts, not drop-frame edges. */
export function getSnapEdgesForStructureMove(input: {
  tree: TimelineTree;
  itemId: string;
  playheadFrame?: number;
  includeFrameGrid?: boolean;
}): number[] {
  const ctx = siblingSnapCtx(input.tree, input.itemId);
  if (!ctx) return [];

  const { item } = ctx;
  const edges = new Set<number>();

  addPredecessorSnapEdges(edges, ctx);
  addSuccessorSnapEdges(edges, ctx);

  const excludeAnchors = new Set([item.startFrame, item.endFrame]);
  addPlayheadSnapEdge(edges, input.playheadFrame, excludeAnchors);

  return [...edges];
}

export function snapBoundaryFrame(
  proposed: number,
  edges: number[],
  thresholdFrames: number,
): number {
  if (edges.length === 0) return proposed;
  let best = proposed;
  let bestDist = thresholdFrames + 1;
  for (const edge of edges) {
    const dist = Math.abs(edge - proposed);
    if (dist <= thresholdFrames && dist < bestDist) {
      bestDist = dist;
      best = edge;
    }
  }
  return best;
}
