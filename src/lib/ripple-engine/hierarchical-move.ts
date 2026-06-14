/**
 * VETILALORAPP — horizontal structure move + reparent (CapCut body drag).
 * Location: src/lib/ripple-engine/hierarchical-move.ts
 */

import type {
  ItemKind,
  RippleResult,
  TimelineItem,
  TimelineTree,
} from "../timeline-tree/types";
import { DEFAULT_MIN_ITEM_DURATION_FRAMES } from "../timeline-tree/types";
import { validateTimelineTree } from "../timeline-tree/invariants";
import { repackPackedTimeline } from "../timeline-tree/repair";
import {
  cloneTimelineTree,
  diffChangedIds,
  getSortedSiblings,
  mutateItemFrames,
  rebuildChildrenOf,
} from "../timeline-tree/tree-utils";
import { shiftItemSubtree } from "./hierarchical-siblings";
import {
  enforceParentShellsFromChildren,
  finalizeHierarchyBubble,
} from "./hierarchical-parent-fit";

export interface MoveStructureItemInput {
  tree: TimelineTree;
  itemId: string;
  deltaFrames: number;
  minItemDurationFrames?: number;
  /** Frozen drag snapshot — skips an extra clone when previewing from move session. */
  beforeTree?: TimelineTree;
}

export interface ReparentStructureItemInput {
  tree: TimelineTree;
  itemId: string;
  newParentId: string;
  targetStartFrame: number;
  minItemDurationFrames?: number;
  beforeTree?: TimelineTree;
}

function expectedParentKind(itemKind: ItemKind): ItemKind | null {
  if (itemKind === "sequence") return "act";
  if (itemKind === "scene") return "sequence";
  return null;
}

export function computeReorderInsertIndex(
  siblings: TimelineItem[],
  item: TimelineItem,
  deltaFrames: number,
): number {
  const targetCenter = item.startFrame + deltaFrames + item.durationFrames / 2;
  const others = siblings.filter((s) => s.id !== item.id);
  let insertIdx = 0;
  for (const sibling of others) {
    const mid = (sibling.startFrame + sibling.endFrame) / 2;
    if (targetCenter > mid) insertIdx++;
  }
  return insertIdx;
}

/** Packed reorder: pack siblings sequentially in given order from baseStart. */
function packSiblingsInOrder(
  tree: TimelineTree,
  ordered: TimelineItem[],
  baseStart: number,
): void {
  let cursor = baseStart;
  ordered.forEach((sibling, index) => {
    sibling.orderIndex = index;
    const duration = sibling.durationFrames;
    const delta = cursor - sibling.startFrame;
    if (delta !== 0) {
      shiftItemSubtree(tree, sibling.id, delta);
    }
    cursor += duration;
  });
  tree.childrenOf = rebuildChildrenOf(tree.items);
}

export function reindexSiblingsByStartFrame(
  tree: TimelineTree,
  parentId: string | null,
): void {
  const siblings = getSortedSiblings(tree, parentId)
    .slice()
    .sort(
      (a, b) =>
        a.startFrame - b.startFrame ||
        a.orderIndex - b.orderIndex ||
        a.id.localeCompare(b.id),
    );
  siblings.forEach((sibling, index) => {
    sibling.orderIndex = index;
  });
  tree.childrenOf = rebuildChildrenOf(tree.items);
}

export function findActAtFrame(
  tree: TimelineTree,
  frame: number,
): TimelineItem | null {
  const acts = getSortedSiblings(tree, null);
  const inside = acts.filter(
    (act) => frame >= act.startFrame && frame < act.endFrame,
  );
  if (inside.length > 0) return inside[0]!;
  if (acts.length === 0) return null;
  let best = acts[0]!;
  let bestDist = Math.abs(frame - best.startFrame);
  for (const act of acts) {
    const dist = Math.min(
      Math.abs(frame - act.startFrame),
      Math.abs(frame - act.endFrame),
    );
    if (dist < bestDist) {
      best = act;
      bestDist = dist;
    }
  }
  return best;
}

export function findSequenceAtFrame(
  tree: TimelineTree,
  frame: number,
): TimelineItem | null {
  const sequences = [...tree.items.values()].filter(
    (item) => item.kind === "sequence",
  );
  const inside = sequences.filter(
    (seq) => frame >= seq.startFrame && frame < seq.endFrame,
  );
  if (inside.length > 0) {
    return inside.sort((a, b) => a.startFrame - b.startFrame)[0]!;
  }
  if (sequences.length === 0) return null;
  let best = sequences[0]!;
  let bestDist = Math.abs(frame - best.startFrame);
  for (const seq of sequences) {
    const dist = Math.min(
      Math.abs(frame - seq.startFrame),
      Math.abs(frame - seq.endFrame),
    );
    if (dist < bestDist) {
      best = seq;
      bestDist = dist;
    }
  }
  return best;
}

/** Insertion frame for drop-zone UI (left edge of dragged block after preview). */
export function getMoveInsertionFrame(
  tree: TimelineTree,
  itemId: string,
): number | null {
  const item = tree.items.get(itemId);
  return item ? item.startFrame : null;
}

/**
 * Same-parent body move = pure reorder (drag & drop): the dragged block snaps
 * to a new position once its drop center crosses a sibling midpoint. No
 * trim/roll here — left-grow into the predecessor is the trim handle's job.
 */
export function moveStructureItem(input: MoveStructureItemInput): RippleResult {
  const minDur =
    input.minItemDurationFrames ?? DEFAULT_MIN_ITEM_DURATION_FRAMES;
  const before = input.beforeTree ?? cloneTimelineTree(input.tree);
  const next = cloneTimelineTree(input.tree);
  const item = next.items.get(input.itemId);

  if (!item || item.locked) {
    return {
      before,
      next,
      changedIds: new Set(),
      blocked: true,
      blockReason: "locked",
    };
  }

  const siblings = getSortedSiblings(next, item.parentId);
  if (siblings.length < 2 || input.deltaFrames === 0) {
    return { before, next, changedIds: new Set(), blocked: false };
  }

  const insertIdx = computeReorderInsertIndex(
    siblings,
    item,
    input.deltaFrames,
  );
  const others = siblings.filter((s) => s.id !== item.id);
  const ordered = [
    ...others.slice(0, insertIdx),
    item,
    ...others.slice(insertIdx),
  ];
  const wouldReorder = !ordered.every(
    (sibling, index) => sibling.id === siblings[index]!.id,
  );

  if (!wouldReorder) {
    // No midpoint crossed → drag & drop is a no-op (block snaps back).
    return { before, next, changedIds: new Set(), blocked: false };
  }

  const baseStart = siblings[0]!.startFrame;
  let cursor = baseStart;
  for (const sibling of ordered) {
    if (sibling.locked && sibling.startFrame !== cursor) {
      return {
        before,
        next,
        changedIds: new Set(),
        blocked: true,
        blockReason: "locked_ripple",
      };
    }
    cursor += sibling.durationFrames;
  }
  packSiblingsInOrder(next, ordered, baseStart);

  const errors = validateTimelineTree(next, { minItemDurationFrames: minDur });
  if (errors.length > 0) {
    return {
      before,
      next,
      changedIds: new Set(),
      blocked: true,
      blockReason: "would_violate_invariant",
      invariantErrors: errors,
    };
  }

  return {
    before,
    next,
    changedIds: diffChangedIds(before, next),
    blocked: false,
  };
}

export function reparentStructureItem(
  input: ReparentStructureItemInput,
): RippleResult {
  const minDur =
    input.minItemDurationFrames ?? DEFAULT_MIN_ITEM_DURATION_FRAMES;
  const before = input.beforeTree ?? cloneTimelineTree(input.tree);
  const next = cloneTimelineTree(input.tree);
  const item = next.items.get(input.itemId);
  const newParent = next.items.get(input.newParentId);

  if (!item || !newParent || item.locked) {
    return {
      before,
      next,
      changedIds: new Set(),
      blocked: true,
      blockReason: "locked",
    };
  }

  const expected = expectedParentKind(item.kind);
  if (!expected || newParent.kind !== expected) {
    return {
      before,
      next,
      changedIds: new Set(),
      blocked: true,
      blockReason: "would_violate_invariant",
    };
  }

  if (item.parentId === input.newParentId) {
    return moveStructureItem({
      tree: input.tree,
      itemId: input.itemId,
      deltaFrames: input.targetStartFrame - item.startFrame,
      minItemDurationFrames: minDur,
      beforeTree: input.beforeTree,
    });
  }

  const oldParentId = item.parentId;
  const oldStart = item.startFrame;
  const duration = item.durationFrames;
  let targetStart = Math.max(newParent.startFrame, input.targetStartFrame);
  targetStart = Math.min(
    targetStart,
    Math.max(newParent.startFrame, newParent.endFrame - duration),
  );

  item.parentId = input.newParentId;
  const delta = targetStart - oldStart;
  mutateItemFrames(item, targetStart, targetStart + duration);
  if (delta !== 0) {
    for (const child of getSortedSiblings(next, item.id)) {
      shiftItemSubtree(next, child.id, delta);
    }
  }

  reindexSiblingsByStartFrame(next, oldParentId);
  reindexSiblingsByStartFrame(next, input.newParentId);
  repackPackedTimeline(next, minDur);
  finalizeHierarchyBubble(next, item.id, minDur);
  enforceParentShellsFromChildren(next, minDur);

  const errors = validateTimelineTree(next, { minItemDurationFrames: minDur });
  if (errors.length > 0) {
    return {
      before,
      next,
      changedIds: new Set(),
      blocked: true,
      blockReason: "would_violate_invariant",
      invariantErrors: errors,
    };
  }

  return {
    before,
    next,
    changedIds: diffChangedIds(before, next),
    blocked: false,
  };
}

/** Same-parent reorder for a contiguous multi-selection block (relative order preserved). */
export function moveStructureItemGroup(input: {
  tree: TimelineTree;
  selectedIds: string[];
  anchorItemId: string;
  deltaFrames: number;
  minItemDurationFrames?: number;
  beforeTree?: TimelineTree;
}): RippleResult {
  const minDur =
    input.minItemDurationFrames ?? DEFAULT_MIN_ITEM_DURATION_FRAMES;
  const before = input.beforeTree ?? cloneTimelineTree(input.tree);
  const next = cloneTimelineTree(input.tree);

  const selected = input.selectedIds
    .map((id) => next.items.get(id))
    .filter((item): item is TimelineItem => Boolean(item));

  if (selected.length < 2) {
    return moveStructureItem({
      tree: input.tree,
      itemId: input.anchorItemId,
      deltaFrames: input.deltaFrames,
      minItemDurationFrames: minDur,
      beforeTree: input.beforeTree,
    });
  }

  const anchor = next.items.get(input.anchorItemId);
  if (!anchor) {
    return {
      before,
      next,
      changedIds: new Set(),
      blocked: true,
      blockReason: "would_violate_invariant",
    };
  }

  const parentId = anchor.parentId;
  if (!selected.every((item) => item.parentId === parentId)) {
    return {
      before,
      next,
      changedIds: new Set(),
      blocked: true,
      blockReason: "would_violate_invariant",
    };
  }

  const siblings = getSortedSiblings(next, parentId);
  const selectedSet = new Set(input.selectedIds);
  const block = siblings.filter((s) => selectedSet.has(s.id));
  const others = siblings.filter((s) => !selectedSet.has(s.id));

  if (block.length < 2 || siblings.length < 2 || input.deltaFrames === 0) {
    return { before, next, changedIds: new Set(), blocked: false };
  }

  const targetCenter =
    anchor.startFrame + input.deltaFrames + anchor.durationFrames / 2;
  let insertIdx = 0;
  for (const sibling of others) {
    const mid = (sibling.startFrame + sibling.endFrame) / 2;
    if (targetCenter > mid) insertIdx++;
  }

  const ordered = [
    ...others.slice(0, insertIdx),
    ...block,
    ...others.slice(insertIdx),
  ];
  const wouldReorder = !ordered.every(
    (sibling, index) => sibling.id === siblings[index]!.id,
  );

  if (!wouldReorder) {
    return { before, next, changedIds: new Set(), blocked: false };
  }

  const baseStart = siblings[0]!.startFrame;
  let cursor = baseStart;
  for (const sibling of ordered) {
    if (sibling.locked && sibling.startFrame !== cursor) {
      return {
        before,
        next,
        changedIds: new Set(),
        blocked: true,
        blockReason: "locked_ripple",
      };
    }
    cursor += sibling.durationFrames;
  }

  packSiblingsInOrder(next, ordered, baseStart);

  const errors = validateTimelineTree(next, { minItemDurationFrames: minDur });
  if (errors.length > 0) {
    return {
      before,
      next,
      changedIds: new Set(),
      blocked: true,
      blockReason: "would_violate_invariant",
      invariantErrors: errors,
    };
  }

  return {
    before,
    next,
    changedIds: diffChangedIds(before, next),
    blocked: false,
  };
}

export function resolveStructureMoveOperation(input: {
  tree: TimelineTree;
  itemId: string;
  deltaFrames: number;
  dropFrame: number;
  minItemDurationFrames?: number;
  beforeTree?: TimelineTree;
}): RippleResult {
  const item = input.tree.items.get(input.itemId);
  if (!item) {
    return {
      before: input.tree,
      next: input.tree,
      changedIds: new Set(),
      blocked: true,
      blockReason: "would_violate_invariant",
    };
  }

  if (item.kind === "sequence") {
    const targetAct = findActAtFrame(input.tree, input.dropFrame);
    if (targetAct && targetAct.id !== item.parentId) {
      return reparentStructureItem({
        tree: input.tree,
        itemId: input.itemId,
        newParentId: targetAct.id,
        targetStartFrame: input.dropFrame,
        minItemDurationFrames: input.minItemDurationFrames,
        beforeTree: input.beforeTree,
      });
    }
  }

  if (item.kind === "scene") {
    const targetSeq = findSequenceAtFrame(input.tree, input.dropFrame);
    if (targetSeq && targetSeq.id !== item.parentId) {
      return reparentStructureItem({
        tree: input.tree,
        itemId: input.itemId,
        newParentId: targetSeq.id,
        targetStartFrame: input.dropFrame,
        minItemDurationFrames: input.minItemDurationFrames,
        beforeTree: input.beforeTree,
      });
    }
  }

  return moveStructureItem({
    tree: input.tree,
    itemId: input.itemId,
    deltaFrames: input.deltaFrames,
    minItemDurationFrames: input.minItemDurationFrames,
    beforeTree: input.beforeTree,
  });
}
