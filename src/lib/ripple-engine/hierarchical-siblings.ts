/**
 * VETILALORAPP — sibling ripple + roll-boundary moves on TimelineTree.
 * Location: src/lib/ripple-engine/hierarchical-siblings.ts
 */

import type { TimelineTree, TrimSide } from "../timeline-tree/types";
import {
  getSortedSiblings,
  mutateItemFrames,
} from "../timeline-tree/tree-utils";
import { setBoundaryAndReturnDelta } from "./hierarchical-boundary";

export function shiftItemSubtree(
  tree: TimelineTree,
  itemId: string,
  delta: number,
): void {
  if (delta === 0) return;
  const item = tree.items.get(itemId);
  if (!item) return;
  mutateItemFrames(item, item.startFrame + delta, item.endFrame + delta);
  for (const child of getSortedSiblings(tree, itemId)) {
    shiftItemSubtree(tree, child.id, delta);
  }
}

/** Ripple = following siblings shift as whole subtrees, both for grow and shrink (CapCut, no gaps). */
export function rippleRightSiblings(
  tree: TimelineTree,
  parentId: string | null,
  fromOrderIndex: number,
  delta: number,
  _minDur: number,
): void {
  if (delta === 0) return;
  const siblings = getSortedSiblings(tree, parentId);
  const idx = siblings.findIndex((s) => s.orderIndex === fromOrderIndex);
  if (idx < 0) return;

  for (let i = idx + 1; i < siblings.length; i++) {
    shiftItemSubtree(tree, siblings[i]!.id, delta);
  }
}

/** Mirror of rippleRightSiblings: earlier siblings shift as whole subtrees by startDelta. */
export function rippleLeftSiblings(
  tree: TimelineTree,
  parentId: string | null,
  fromOrderIndex: number,
  startDelta: number,
  _minDur: number,
): void {
  if (startDelta === 0) return;
  const siblings = getSortedSiblings(tree, parentId);
  const idx = siblings.findIndex((s) => s.orderIndex === fromOrderIndex);
  if (idx <= 0) return;

  for (let i = 0; i < idx; i++) {
    shiftItemSubtree(tree, siblings[i]!.id, startDelta);
  }
}

export function checkLockedRippleBlock(
  tree: TimelineTree,
  parentId: string | null,
  orderIndex: number,
  delta: number,
  side: TrimSide,
): boolean {
  for (const sib of getSortedSiblings(tree, parentId)) {
    if (!sib.locked) continue;
    if (side === "right" && delta > 0 && sib.orderIndex > orderIndex)
      return true;
    if (side === "left" && delta < 0 && sib.orderIndex < orderIndex)
      return true;
  }
  return false;
}

export function applyRollBoundary(
  tree: TimelineTree,
  itemId: string,
  side: TrimSide,
  boundary: number,
  minDur: number,
): number {
  const item = tree.items.get(itemId);
  if (!item) return 0;

  const siblings = getSortedSiblings(tree, item.parentId);
  const idx = siblings.findIndex((s) => s.id === itemId);
  if (idx < 0) return 0;

  if (side === "right" && idx < siblings.length - 1) {
    const nextSib = siblings[idx + 1]!;
    const delta = setBoundaryAndReturnDelta(
      tree,
      itemId,
      side,
      boundary,
      minDur,
    );
    if (delta !== 0) {
      mutateItemFrames(
        nextSib,
        nextSib.startFrame + delta,
        Math.max(nextSib.startFrame + delta + minDur, nextSib.endFrame),
      );
    }
    return delta;
  }

  if (side === "left" && idx > 0) {
    const prev = siblings[idx - 1]!;
    const delta = setBoundaryAndReturnDelta(
      tree,
      itemId,
      side,
      boundary,
      minDur,
    );
    if (delta !== 0) {
      mutateItemFrames(
        prev,
        prev.startFrame,
        Math.max(prev.startFrame + minDur, prev.endFrame + delta),
      );
    }
    return delta;
  }

  return setBoundaryAndReturnDelta(tree, itemId, side, boundary, minDur);
}
