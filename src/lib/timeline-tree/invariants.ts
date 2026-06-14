/**
 * VETILALORAPP — post-condition validation for TimelineTree.
 * Location: src/lib/timeline-tree/invariants.ts
 */

import type {
  TimelineInvariantError,
  TimelineItem,
  TimelineTree,
} from "./types";
import { getSortedSiblings } from "./tree-utils";

export interface ValidateTimelineTreeOptions {
  minItemDurationFrames?: number;
}

const GAP_EPS_FRAMES = 1;

export function validateTimelineTree(
  tree: TimelineTree,
  opts: ValidateTimelineTreeOptions = {},
): TimelineInvariantError[] {
  const minDur = opts.minItemDurationFrames ?? 1;
  const errors: TimelineInvariantError[] = [];
  const seenIds = new Set<string>();

  for (const item of tree.items.values()) {
    if (seenIds.has(item.id)) {
      errors.push({
        code: "duplicate_id",
        message: `Duplicate id ${item.id}`,
        itemId: item.id,
      });
    }
    seenIds.add(item.id);

    const dur = item.endFrame - item.startFrame;
    if (dur < 0) {
      errors.push({
        code: "negative_duration",
        message: `Negative duration for ${item.id}`,
        itemId: item.id,
      });
    }
    if (dur < minDur) {
      errors.push({
        code: "below_min_duration",
        message: `Below min duration for ${item.id}`,
        itemId: item.id,
      });
    }

    const parent = item.parentId ? tree.items.get(item.parentId) : null;
    if (parent) {
      if (
        item.startFrame < parent.startFrame ||
        item.endFrame > parent.endFrame
      ) {
        errors.push({
          code: "child_outside_parent",
          message: `Child ${item.id} outside parent ${parent.id}`,
          itemId: item.id,
        });
      }
    }
  }

  const parentKeys = new Set<string | null>();
  for (const item of tree.items.values()) {
    parentKeys.add(item.parentId);
  }
  for (const parentId of parentKeys) {
    const siblings = getSortedSiblings(tree, parentId);
    for (let i = 1; i < siblings.length; i++) {
      const prev = siblings[i - 1]!;
      const cur = siblings[i]!;
      if (cur.startFrame < prev.endFrame - GAP_EPS_FRAMES) {
        errors.push({
          code: "sibling_overlap",
          message: `Overlap ${prev.id} / ${cur.id}`,
          itemId: cur.id,
        });
      }
      if (cur.startFrame > prev.endFrame + GAP_EPS_FRAMES) {
        errors.push({
          code: "implicit_gap",
          message: `Gap ${prev.id} / ${cur.id}`,
          itemId: cur.id,
        });
      }
    }

    if (parentId !== null) {
      const parent = tree.items.get(parentId);
      const children = siblings;
      if (parent && children.length > 0) {
        const hullStart = children[0]!.startFrame;
        const hullEnd = children[children.length - 1]!.endFrame;
        if (parent.startFrame !== hullStart) {
          errors.push({
            code: "parent_hull_mismatch",
            message: `Parent start hull mismatch ${parentId}`,
            itemId: parentId,
          });
        }
        if (parent.endFrame < hullEnd) {
          errors.push({
            code: "parent_hull_mismatch",
            message: `Parent end below child hull ${parentId}`,
            itemId: parentId,
          });
        }
      }
    }
  }

  for (const item of tree.items.values()) {
    if (hasParentCycle(tree, item.id)) {
      errors.push({
        code: "parent_cycle",
        message: `Cycle at ${item.id}`,
        itemId: item.id,
      });
      break;
    }
  }

  return errors;
}

function hasParentCycle(tree: TimelineTree, startId: string): boolean {
  const visited = new Set<string>();
  let cur: string | null = startId;
  for (let i = 0; i < tree.items.size + 2; i++) {
    const item: TimelineItem | undefined = cur
      ? tree.items.get(cur)
      : undefined;
    if (!item) return false;
    if (visited.has(item.id)) return true;
    visited.add(item.id);
    cur = item.parentId;
  }
  return false;
}

export function assertTimelineTreeValid(
  tree: TimelineTree,
  opts?: ValidateTimelineTreeOptions,
): void {
  const errors = validateTimelineTree(tree, opts);
  if (errors.length > 0) {
    throw new Error(
      `Invalid timeline tree: ${errors.map((e) => e.code).join(", ")}`,
    );
  }
}
