/**
 * VETILALORAPP — hierarchical bubble ripple entry (resizeStructureItem).
 * Location: src/lib/ripple-engine/hierarchical.ts
 */

import type { RippleResult } from "../timeline-tree/types";
import { validateTimelineTree } from "../timeline-tree/invariants";
import {
  cloneTimelineTree,
  diffChangedIds,
  getSortedSiblings,
  minSubtreeDurationFrames,
} from "../timeline-tree/tree-utils";
import { snapBoundaryFrame } from "./snap";
import {
  clampBoundaryToChildren,
  setBoundaryAndReturnDelta,
} from "./hierarchical-boundary";
import {
  applyRollBoundary,
  checkLockedRippleBlock,
  rippleLeftSiblings,
  rippleRightSiblings,
  shiftItemSubtree,
} from "./hierarchical-siblings";
import {
  finalizeHierarchyBubble,
  syncOutermostChildrenToParentBoundary,
} from "./hierarchical-parent-fit";
import { shrinkPredecessorForLeftGrow } from "./hierarchical-predecessor-roll";

export type { ResizeStructureItemInput } from "./hierarchical-types";
export {
  fitParentToChildren,
  enforceParentShellsFromChildren,
} from "./hierarchical-parent-fit";
import type { ResizeStructureItemInput } from "./hierarchical-types";

export function resizeStructureItem(
  input: ResizeStructureItemInput,
): RippleResult {
  const minDur = input.minItemDurationFrames ?? 1;
  const operation = input.operation ?? "ripple-resize";
  const before = cloneTimelineTree(input.tree);
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

  const snapped = snapBoundaryFrame(
    input.newBoundaryFrame,
    input.snapEdgesFrame ?? [],
    input.snapThresholdFrames ?? 0,
  );
  const clamped = clampBoundaryToChildren(
    next,
    input.itemId,
    input.side,
    snapped,
    minDur,
  );

  let delta: number;

  if (operation === "roll-boundary") {
    delta = applyRollBoundary(next, input.itemId, input.side, clamped, minDur);
  } else if (operation === "shell-resize") {
    delta = setBoundaryAndReturnDelta(
      next,
      input.itemId,
      input.side,
      clamped,
      minDur,
    );
    if (delta !== 0) {
      if (
        checkLockedRippleBlock(
          next,
          item.parentId,
          item.orderIndex,
          delta,
          input.side,
        )
      ) {
        return {
          before,
          next,
          changedIds: new Set(),
          blocked: true,
          blockReason: "locked_ripple",
        };
      }
      if (input.side === "right") {
        rippleRightSiblings(
          next,
          item.parentId,
          item.orderIndex,
          delta,
          minDur,
        );
      } else if (delta < 0) {
        shrinkPredecessorForLeftGrow(
          next,
          input.itemId,
          item.startFrame,
          minDur,
        );
      } else {
        rippleLeftSiblings(next, item.parentId, item.orderIndex, delta, minDur);
      }
    }
  } else {
    const siblings = getSortedSiblings(next, item.parentId);
    const sibIdx = siblings.findIndex((s) => s.id === item.id);
    const leftGrowIntoPred =
      input.side === "left" && snapped < item.startFrame && sibIdx > 0;

    if (leftGrowIntoPred) {
      const pred = siblings[sibIdx - 1]!;
      const minStart =
        pred.startFrame + minSubtreeDurationFrames(next, pred.id, minDur);
      const targetStart = Math.max(minStart, snapped);
      if (targetStart >= item.startFrame) {
        return { before, next, changedIds: new Set(), blocked: false };
      }
      if (
        checkLockedRippleBlock(
          next,
          item.parentId,
          item.orderIndex,
          targetStart - item.startFrame,
          input.side,
        )
      ) {
        return {
          before,
          next,
          changedIds: new Set(),
          blocked: true,
          blockReason: "locked_ripple",
        };
      }
      const growDelta = targetStart - item.startFrame;
      shrinkPredecessorForLeftGrow(next, input.itemId, targetStart, minDur);
      shiftItemSubtree(next, input.itemId, growDelta);
      delta = growDelta;
    } else {
      delta = setBoundaryAndReturnDelta(
        next,
        input.itemId,
        input.side,
        clamped,
        minDur,
      );

      if (delta === 0) {
        return { before, next, changedIds: new Set(), blocked: false };
      }

      if (
        checkLockedRippleBlock(
          next,
          item.parentId,
          item.orderIndex,
          delta,
          input.side,
        )
      ) {
        return {
          before,
          next,
          changedIds: new Set(),
          blocked: true,
          blockReason: "locked_ripple",
        };
      }

      syncOutermostChildrenToParentBoundary(
        next,
        input.itemId,
        input.side,
        minDur,
      );

      if (input.side === "right") {
        rippleRightSiblings(
          next,
          item.parentId,
          item.orderIndex,
          delta,
          minDur,
        );
      } else if (delta !== 0 && sibIdx > 0) {
        // Left trim (grow or shrink): predecessor tail follows junction; no rippleLeft gap at 0.
        shrinkPredecessorForLeftGrow(
          next,
          input.itemId,
          item.startFrame,
          minDur,
        );
      } else if (delta !== 0) {
        rippleLeftSiblings(next, item.parentId, item.orderIndex, delta, minDur);
      }
    }
  }

  if (delta === 0) {
    return { before, next, changedIds: new Set(), blocked: false };
  }

  if (operation !== "shell-resize") {
    finalizeHierarchyBubble(next, input.itemId, minDur);
  } else {
    const maxEnd = getSortedSiblings(next, null).at(-1)?.endFrame ?? 0;
    if (maxEnd > next.projectDurationFrames) {
      next.projectDurationFrames = maxEnd;
    }
  }

  const errors = validateTimelineTree(next, {
    minItemDurationFrames: minDur,
  });
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
