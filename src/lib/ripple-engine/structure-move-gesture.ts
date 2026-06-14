/**
 * VETILALORAPP — pointer → frame delta for structure body-move (single source).
 * Location: src/lib/ripple-engine/structure-move-gesture.ts
 *
 * Preview (follow, slot) and commit share the same raw pointer delta.
 * Commit-only: magnetic snap on block center → sibling midpoint when close.
 */

import type { TimelineTree } from "../timeline-tree/types";
import { getSortedSiblings } from "../timeline-tree/tree-utils";
import { getStructureMoveInsertionSlot } from "./structure-move-drop-zone";
import { snapBoundaryFrame } from "./snap";

export interface StructureMovePointerDelta {
  deltaFrames: number;
  dropFrame: number;
  /** Viewport-relative left px; same frame basis as deltaFrames. */
  dragLeftPx: number;
}

export function resolveStructureMovePointerDelta(input: {
  startFrame: number;
  startClientX: number;
  clientX: number;
  pxPerFrame: number;
  viewStartFrame: number;
}): StructureMovePointerDelta {
  const deltaFrames = Math.round(
    (input.clientX - input.startClientX) / input.pxPerFrame,
  );
  const dropFrame = input.startFrame + deltaFrames;
  const dragLeftPx =
    (input.startFrame - input.viewStartFrame) * input.pxPerFrame +
    deltaFrames * input.pxPerFrame;
  return { deltaFrames, dropFrame, dragLeftPx };
}

function siblingMidpointEdges(tree: TimelineTree, itemId: string): number[] {
  const item = tree.items.get(itemId);
  if (!item) return [];
  return getSortedSiblings(tree, item.parentId)
    .filter((s) => s.id !== item.id)
    .map((s) => Math.round((s.startFrame + s.endFrame) / 2));
}

function moveWouldChange(
  tree: TimelineTree,
  itemId: string,
  deltaFrames: number,
  dropFrame: number,
): boolean {
  return (
    getStructureMoveInsertionSlot({
      tree,
      itemId,
      deltaFrames,
      dropFrame,
    })?.wouldChange === true
  );
}

/** On pointerup: snap block center to a sibling midpoint when within threshold. */
export function resolveStructureMoveCommitDelta(input: {
  tree: TimelineTree;
  itemId: string;
  startFrame: number;
  durationFrames: number;
  deltaFrames: number;
  dropFrame: number;
  snapThresholdFrames: number;
}): Pick<StructureMovePointerDelta, "deltaFrames" | "dropFrame"> {
  const raw = {
    deltaFrames: input.deltaFrames,
    dropFrame: input.dropFrame,
  };
  if (
    moveWouldChange(input.tree, input.itemId, raw.deltaFrames, raw.dropFrame)
  ) {
    return raw;
  }

  const centerEdges = siblingMidpointEdges(input.tree, input.itemId);
  if (centerEdges.length === 0) return raw;

  const rawCenter =
    input.startFrame + raw.deltaFrames + input.durationFrames / 2;
  const snappedCenter = snapBoundaryFrame(
    rawCenter,
    centerEdges,
    input.snapThresholdFrames,
  );
  if (snappedCenter === rawCenter) return raw;

  const snappedDrop = Math.round(snappedCenter - input.durationFrames / 2);
  const snappedDelta = snappedDrop - input.startFrame;
  if (moveWouldChange(input.tree, input.itemId, snappedDelta, snappedDrop)) {
    return { deltaFrames: snappedDelta, dropFrame: snappedDrop };
  }
  return raw;
}
