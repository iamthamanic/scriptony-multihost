/**
 * VETILALORAPP — CapCut roll into predecessor (trim left-grow + body-move).
 * Location: src/lib/ripple-engine/hierarchical-predecessor-roll.ts
 */

import type { TimelineTree } from "../timeline-tree/types";
import {
  getSortedSiblings,
  mutateItemFrames,
} from "../timeline-tree/tree-utils";
import { shrinkChildrenRightTo } from "./hierarchical-parent-fit";

/**
 * Left-grow into immediate predecessor: predecessor shrinks from the right;
 * first lane sibling stays pinned at laneStart (Acts: frame 0).
 */
export function shrinkPredecessorForLeftGrow(
  tree: TimelineTree,
  itemId: string,
  boundaryStart: number,
  minDur: number,
): void {
  const item = tree.items.get(itemId);
  if (!item) return;

  const siblings = getSortedSiblings(tree, item.parentId);
  const idx = siblings.findIndex((s) => s.id === itemId);
  if (idx <= 0) return;

  const pred = siblings[idx - 1]!;
  // Root acts pin at timeline frame 0; nested lanes pin at first sibling start.
  const laneStart = item.parentId === null ? 0 : siblings[0]!.startFrame;

  if (pred.id === siblings[0]!.id) {
    mutateItemFrames(pred, laneStart, boundaryStart);
  } else {
    mutateItemFrames(pred, pred.startFrame, boundaryStart);
  }

  if (getSortedSiblings(tree, pred.id).length > 0) {
    shrinkChildrenRightTo(tree, pred.id, boundaryStart, minDur);
  }
}
