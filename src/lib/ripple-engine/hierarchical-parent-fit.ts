/**
 * VETILALORAPP — parent shell fit, stabilization, and act-gap repair.
 * Location: src/lib/ripple-engine/hierarchical-parent-fit.ts
 */

import type { TimelineTree, TrimSide } from "../timeline-tree/types";
import { fitParentShellsToChildHull } from "../timeline-tree/pack";
import {
  getSortedSiblings,
  minSubtreeDurationFrames,
  mutateItemFrames,
} from "../timeline-tree/tree-utils";
import {
  rippleLeftSiblings,
  rippleRightSiblings,
  shiftItemSubtree,
} from "./hierarchical-siblings";

function ensureProjectFits(tree: TimelineTree): void {
  const roots = getSortedSiblings(tree, null);
  if (!roots.length) return;
  const maxEnd = roots[roots.length - 1]!.endFrame;
  if (maxEnd > tree.projectDurationFrames) {
    tree.projectDurationFrames = maxEnd;
  }
}

export function fitParentToChildren(
  tree: TimelineTree,
  parentId: string,
): { startDelta: number; endDelta: number } | null {
  const parent = tree.items.get(parentId);
  const children = getSortedSiblings(tree, parentId);
  if (!parent || children.length === 0) return null;

  const newStart = children[0]!.startFrame;
  const newEnd = children[children.length - 1]!.endFrame;
  if (newStart === parent.startFrame && newEnd === parent.endFrame) return null;

  const startDelta = newStart - parent.startFrame;
  const endDelta = newEnd - parent.endFrame;
  mutateItemFrames(parent, newStart, newEnd);
  return { startDelta, endDelta };
}

function propagateParentFit(
  tree: TimelineTree,
  changedItemId: string,
  minDur: number,
): void {
  const child = tree.items.get(changedItemId);
  if (!child) return;

  let parentId = child.parentId;
  while (parentId !== null) {
    const fit = fitParentToChildren(tree, parentId);
    const parent = tree.items.get(parentId)!;

    if (fit) {
      if (fit.endDelta !== 0) {
        rippleRightSiblings(
          tree,
          parent.parentId,
          parent.orderIndex,
          fit.endDelta,
          minDur,
        );
      }
      if (fit.startDelta !== 0) {
        rippleLeftSiblings(
          tree,
          parent.parentId,
          parent.orderIndex,
          fit.startDelta,
          minDur,
        );
      }
    }

    parentId = parent.parentId;
  }
}

function stabilizeTreeHierarchy(tree: TimelineTree, minDur: number): void {
  for (let pass = 0; pass < 12; pass++) {
    let anyChange = false;
    for (const item of tree.items.values()) {
      if (item.parentId === null) continue;
      const fit = fitParentToChildren(tree, item.parentId);
      if (!fit) continue;
      anyChange = true;
      const parent = tree.items.get(item.parentId)!;
      if (fit.endDelta !== 0) {
        rippleRightSiblings(
          tree,
          parent.parentId,
          parent.orderIndex,
          fit.endDelta,
          minDur,
        );
      }
      if (fit.startDelta !== 0) {
        rippleLeftSiblings(
          tree,
          parent.parentId,
          parent.orderIndex,
          fit.startDelta,
          minDur,
        );
      }
    }
    if (!anyChange) break;
  }
}

/**
 * Cascade right-edge shrink: children give up tail space from right to left,
 * each down to its min subtree duration (recursive, CapCut ripple-resize).
 * Precondition: targetEnd >= hullStart + minSubtreeDuration (boundary clamp).
 */
export function shrinkChildrenRightTo(
  tree: TimelineTree,
  parentId: string,
  targetEnd: number,
  minDur: number,
): void {
  const children = getSortedSiblings(tree, parentId);
  let cursorEnd = targetEnd;

  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i]!;
    if (child.endFrame <= cursorEnd) break;

    const minD = minSubtreeDurationFrames(tree, child.id, minDur);
    const newStart = Math.min(child.startFrame, cursorEnd - minD);
    if (newStart !== child.startFrame) {
      shiftItemSubtree(tree, child.id, newStart - child.startFrame);
    }
    if (child.endFrame > cursorEnd) {
      mutateItemFrames(child, child.startFrame, cursorEnd);
      shrinkChildrenRightTo(tree, child.id, cursorEnd, minDur);
    }
    cursorEnd = child.startFrame;
  }
}

/** Recursive grow: the last child chain absorbs the new tail space (down to shots). */
function stretchLastChildChainTo(
  tree: TimelineTree,
  parentId: string,
  targetEnd: number,
): void {
  const children = getSortedSiblings(tree, parentId);
  const last = children[children.length - 1];
  if (!last || last.endFrame >= targetEnd) return;
  mutateItemFrames(last, last.startFrame, targetEnd);
  stretchLastChildChainTo(tree, last.id, targetEnd);
}

/** Recursive grow mirror: the first child chain absorbs new head space. */
function stretchFirstChildChainTo(
  tree: TimelineTree,
  parentId: string,
  targetStart: number,
): void {
  const children = getSortedSiblings(tree, parentId);
  const first = children[0];
  if (!first || first.startFrame <= targetStart) return;
  mutateItemFrames(first, targetStart, first.endFrame);
  stretchFirstChildChainTo(tree, first.id, targetStart);
}

function syncOutermostChildrenToParentBoundary(
  tree: TimelineTree,
  itemId: string,
  side: TrimSide,
  minDur: number,
): void {
  const item = tree.items.get(itemId);
  if (!item) return;
  const children = getSortedSiblings(tree, itemId);
  if (children.length === 0) return;

  if (side === "right") {
    const last = children[children.length - 1]!;
    if (last.endFrame < item.endFrame) {
      stretchLastChildChainTo(tree, itemId, item.endFrame);
    } else if (last.endFrame > item.endFrame) {
      shrinkChildrenRightTo(tree, itemId, item.endFrame, minDur);
    }
    propagateParentFit(tree, last.id, minDur);
    return;
  }

  const first = children[0]!;
  if (first.startFrame > item.startFrame) {
    stretchFirstChildChainTo(tree, itemId, item.startFrame);
    propagateParentFit(tree, first.id, minDur);
  }
}

/** Repair parent shells from child hull, then close act-level frame gaps via ripple. */
export function enforceParentShellsFromChildren(
  tree: TimelineTree,
  minDur: number,
): void {
  fitParentShellsToChildHull(tree);

  const acts = getSortedSiblings(tree, null);
  for (let i = 0; i < acts.length - 1; i++) {
    const cur = acts[i]!;
    const nextAct = acts[i + 1]!;
    if (nextAct.startFrame < cur.endFrame) {
      const delta = cur.endFrame - nextAct.startFrame;
      rippleRightSiblings(tree, null, cur.orderIndex, delta, minDur);
    } else if (nextAct.startFrame > cur.endFrame) {
      const gap = nextAct.startFrame - cur.endFrame;
      rippleRightSiblings(tree, null, cur.orderIndex, -gap, minDur);
    }
  }
}

/** Final upward bubble before validate. */
export function finalizeHierarchyBubble(
  tree: TimelineTree,
  leafId: string,
  minDur: number,
): void {
  propagateParentFit(tree, leafId, minDur);
  stabilizeTreeHierarchy(tree, minDur);
  enforceParentShellsFromChildren(tree, minDur);
  ensureProjectFits(tree);
}

export { syncOutermostChildrenToParentBoundary };
