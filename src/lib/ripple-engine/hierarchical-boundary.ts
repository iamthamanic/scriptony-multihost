/**
 * VETILALORAPP — boundary clamp + frame mutation for structure trim.
 * Location: src/lib/ripple-engine/hierarchical-boundary.ts
 */

import type { TimelineTree, TrimSide } from "../timeline-tree/types";
import {
  getSortedSiblings,
  minSubtreeDurationFrames,
  mutateItemFrames,
} from "../timeline-tree/tree-utils";

export function clampBoundaryToChildren(
  tree: TimelineTree,
  itemId: string,
  side: TrimSide,
  boundary: number,
  minDur: number,
): number {
  const item = tree.items.get(itemId);
  if (!item) return boundary;
  const children = getSortedSiblings(tree, itemId);
  const parent = item.parentId ? tree.items.get(item.parentId) : null;
  const maxEnd = parent?.endFrame ?? tree.projectDurationFrames;
  const minStart = parent?.startFrame ?? 0;

  if (children.length === 0) {
    if (side === "right") {
      const growing = boundary > item.endFrame;
      if (growing && item.parentId !== null) {
        return Math.max(item.startFrame + minDur, boundary);
      }
      return Math.max(item.startFrame + minDur, Math.min(maxEnd, boundary));
    }
    const shrinking = boundary > item.startFrame;
    if (!shrinking && item.parentId !== null) {
      return Math.max(0, Math.min(item.endFrame - minDur, boundary));
    }
    return Math.max(minStart, Math.min(item.endFrame - minDur, boundary));
  }

  const childStart = children[0]!.startFrame;
  const childEnd = children[children.length - 1]!.endFrame;

  if (side === "right") {
    const growing = boundary > item.endFrame;
    if (growing) {
      // Root acts may grow past the current project end (ensureProjectFits
      // extends projectDurationFrames; the bridge surfaces a duration hint).
      return Math.max(item.startFrame + minDur, boundary);
    }
    // Shrink below child hull is allowed: children cascade-shrink down to
    // their min subtree durations (CapCut ripple-resize, §4.5).
    const minEnd =
      item.startFrame + minSubtreeDurationFrames(tree, itemId, minDur);
    return Math.max(minEnd, Math.min(maxEnd, boundary));
  }

  const shrinking = boundary > item.startFrame;
  if (shrinking) {
    const maxStart = Math.min(childStart, item.endFrame - minDur);
    return Math.max(minStart, Math.min(maxStart, boundary));
  }
  // Left grow with children: no head-gap (parent.start must match child hull — §4.3 / §5).
  return Math.max(childStart, Math.min(item.endFrame - minDur, boundary));
}

export function setBoundaryAndReturnDelta(
  tree: TimelineTree,
  itemId: string,
  side: TrimSide,
  boundary: number,
  minDur: number,
): number {
  const item = tree.items.get(itemId);
  if (!item) return 0;

  if (side === "right") {
    const oldEnd = item.endFrame;
    const newEnd = Math.max(item.startFrame + minDur, boundary);
    mutateItemFrames(item, item.startFrame, newEnd);
    return newEnd - oldEnd;
  }

  const oldStart = item.startFrame;
  const newStart = Math.min(item.endFrame - minDur, boundary);
  mutateItemFrames(item, newStart, item.endFrame);
  return newStart - oldStart;
}
