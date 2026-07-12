/**
 * VETILALORAPP — repair packed timeline tree after legacy/corrupt layout.
 * Location: src/lib/timeline-tree/repair.ts
 */

import type { TimelineInvariantError, TimelineTree } from "./types";
import { validateTimelineTree } from "./invariants";
import { fitParentShellsToChildHull, packSequentialFrameGaps } from "./pack";
import {
  getSortedSiblings,
  mutateItemFrames,
  rebuildChildrenOf,
} from "./tree-utils";

const GAP_EPS = 1;

function shiftItemSubtree(
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

function collectParentIds(tree: TimelineTree): Array<string | null> {
  const keys = new Set<string | null>();
  for (const item of tree.items.values()) {
    keys.add(item.parentId);
  }
  return [...keys];
}

/** Close sibling overlaps and implicit gaps under each parent. */
function repackSiblingLanes(tree: TimelineTree, minDur: number): void {
  for (const parentId of collectParentIds(tree)) {
    let siblings = getSortedSiblings(tree, parentId);
    if (siblings.length < 2) continue;

    for (let i = 1; i < siblings.length; i++) {
      siblings = getSortedSiblings(tree, parentId);
      const prev = siblings[i - 1]!;
      const cur = siblings[i]!;
      if (cur.startFrame < prev.endFrame - GAP_EPS) {
        shiftItemSubtree(tree, cur.id, prev.endFrame - cur.startFrame);
      }
    }

    siblings = getSortedSiblings(tree, parentId);
    const packed = siblings.map((row) => ({
      startFrame: row.startFrame,
      endFrame: Math.max(row.startFrame + minDur, row.endFrame),
    }));
    packSequentialFrameGaps(packed);
    packed.forEach((row, index) => {
      const item = siblings[index]!;
      const delta = row.startFrame - item.startFrame;
      if (delta !== 0) {
        shiftItemSubtree(tree, item.id, delta);
      }
      const live = tree.items.get(item.id)!;
      if (live.endFrame !== row.endFrame) {
        mutateItemFrames(live, live.startFrame, row.endFrame);
      }
    });
  }
}

/** Parent.start must equal first child start (no head-gap). */
function syncParentStartsToChildHull(tree: TimelineTree): void {
  for (const item of tree.items.values()) {
    const children = getSortedSiblings(tree, item.id);
    if (children.length === 0) continue;
    const hullStart = children[0]!.startFrame;
    if (item.startFrame !== hullStart) {
      mutateItemFrames(item, hullStart, item.endFrame);
    }
  }
}

function closeRootActGaps(tree: TimelineTree): void {
  const acts = getSortedSiblings(tree, null);
  for (let i = 0; i < acts.length - 1; i++) {
    const cur = acts[i]!;
    const nextAct = acts[i + 1]!;
    if (nextAct.startFrame > cur.endFrame + GAP_EPS) {
      shiftItemSubtree(tree, nextAct.id, cur.endFrame - nextAct.startFrame);
    }
  }
}

/** Close sibling overlaps/gaps and sync parent hulls (post move/reparent). */
export function repackPackedTimeline(
  tree: TimelineTree,
  minItemDurationFrames = 1,
): void {
  repackSiblingLanes(tree, minItemDurationFrames);
  syncParentStartsToChildHull(tree);
  fitParentShellsToChildHull(tree);
  closeRootActGaps(tree);
  tree.childrenOf = rebuildChildrenOf(tree.items);
}

export interface RepairTimelineTreeOptions {
  minItemDurationFrames?: number;
  maxPasses?: number;
}

/** Best-effort repair for overlap/gap/hull issues from legacy layout bugs. */
export function repairTimelineTree(
  tree: TimelineTree,
  opts: RepairTimelineTreeOptions = {},
): {
  repaired: boolean;
  errorsBefore: TimelineInvariantError[];
  errorsAfter: TimelineInvariantError[];
} {
  const minDur = opts.minItemDurationFrames ?? 1;
  const maxPasses = opts.maxPasses ?? 4;
  const errorsBefore = validateTimelineTree(tree, {
    minItemDurationFrames: minDur,
  });
  if (errorsBefore.length === 0) {
    return { repaired: false, errorsBefore, errorsAfter: errorsBefore };
  }

  for (let pass = 0; pass < maxPasses; pass++) {
    repackSiblingLanes(tree, minDur);
    syncParentStartsToChildHull(tree);
    fitParentShellsToChildHull(tree);
    closeRootActGaps(tree);
    tree.childrenOf = rebuildChildrenOf(tree.items);

    const errors = validateTimelineTree(tree, {
      minItemDurationFrames: minDur,
    });
    if (errors.length === 0) {
      return { repaired: true, errorsBefore, errorsAfter: errors };
    }
  }

  return {
    repaired: true,
    errorsBefore,
    errorsAfter: validateTimelineTree(tree, { minItemDurationFrames: minDur }),
  };
}

export function diagnoseTimelineTree(
  tree: TimelineTree,
  minItemDurationFrames = 1,
): TimelineInvariantError[] {
  return validateTimelineTree(tree, { minItemDurationFrames });
}
