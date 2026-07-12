/**
 * VETILALORAPP — tree clone / index rebuild helpers.
 * Location: src/lib/timeline-tree/tree-utils.ts
 */

import type { TimelineItem, TimelineTree } from "./types";
import { syncItemDuration } from "./types";

export function cloneTimelineTree(tree: TimelineTree): TimelineTree {
  const items = new Map<string, TimelineItem>();
  for (const [id, item] of tree.items) {
    items.set(id, { ...item });
  }
  return {
    items,
    childrenOf: rebuildChildrenOf(items),
    projectDurationFrames: tree.projectDurationFrames,
    frameRate: tree.frameRate,
  };
}

export function rebuildChildrenOf(
  items: Map<string, TimelineItem>,
): Map<string | null, TimelineItem[]> {
  const childrenOf = new Map<string | null, TimelineItem[]>();
  for (const item of items.values()) {
    const key = item.parentId;
    const list = childrenOf.get(key) ?? [];
    list.push(item);
    childrenOf.set(key, list);
  }
  for (const list of childrenOf.values()) {
    list.sort((a, b) => a.orderIndex - b.orderIndex);
  }
  return childrenOf;
}

export function getSortedSiblings(
  tree: TimelineTree,
  parentId: string | null,
): TimelineItem[] {
  return tree.childrenOf.get(parentId) ?? [];
}

export function diffChangedIds(
  before: TimelineTree,
  next: TimelineTree,
): Set<string> {
  const changed = new Set<string>();
  for (const id of before.items.keys()) {
    const b = before.items.get(id)!;
    const n = next.items.get(id);
    if (
      !n ||
      b.startFrame !== n.startFrame ||
      b.endFrame !== n.endFrame ||
      b.durationFrames !== n.durationFrames ||
      b.parentId !== n.parentId ||
      b.orderIndex !== n.orderIndex
    ) {
      changed.add(id);
    }
  }
  for (const id of next.items.keys()) {
    if (!before.items.has(id)) changed.add(id);
  }
  return changed;
}

export function mutateItemFrames(
  item: TimelineItem,
  startFrame: number,
  endFrame: number,
): void {
  item.startFrame = startFrame;
  item.endFrame = endFrame;
  syncItemDuration(item);
}

/**
 * Smallest duration an item can shrink to without violating min durations
 * anywhere in its subtree (leaf = minDur, parent = sum of child minimums).
 */
export function minSubtreeDurationFrames(
  tree: TimelineTree,
  itemId: string,
  minDur: number,
): number {
  const children = getSortedSiblings(tree, itemId);
  if (children.length === 0) return minDur;
  let total = 0;
  for (const child of children) {
    total += minSubtreeDurationFrames(tree, child.id, minDur);
  }
  return Math.max(minDur, total);
}
