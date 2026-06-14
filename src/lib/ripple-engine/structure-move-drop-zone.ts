/**
 * VETILALORAPP — insertion slot for structure body-move (drag & drop preview).
 * Location: src/lib/ripple-engine/structure-move-drop-zone.ts
 *
 * Computed from the frozen drag-start tree: siblings do NOT move during the
 * drag — the slot only shows where the block will land on release.
 */

import type { TimelineItem, TimelineTree } from "../timeline-tree/types";
import { getSortedSiblings } from "../timeline-tree/tree-utils";
import {
  computeReorderInsertIndex,
  findActAtFrame,
  findSequenceAtFrame,
} from "./hierarchical-move";

export type StructureDropZoneMode = "reorder" | "reparent";

export interface StructureInsertionSlot {
  /** Junction band: startFrame === endFrame for reorder; reparent spans the parent. */
  startFrame: number;
  endFrame: number;
  mode: StructureDropZoneMode;
  /** False → releasing here is a no-op (slot should be hidden). */
  wouldChange: boolean;
}

function reparentSlot(
  tree: TimelineTree,
  item: TimelineItem,
  dropFrame: number,
): StructureInsertionSlot | null {
  if (item.kind === "sequence") {
    const targetAct = findActAtFrame(tree, dropFrame);
    if (!targetAct || targetAct.id === item.parentId) return null;
    return {
      startFrame: targetAct.startFrame,
      endFrame: targetAct.endFrame,
      mode: "reparent",
      wouldChange: true,
    };
  }
  if (item.kind === "scene") {
    const targetSeq = findSequenceAtFrame(tree, dropFrame);
    if (!targetSeq || targetSeq.id === item.parentId) return null;
    return {
      startFrame: targetSeq.startFrame,
      endFrame: targetSeq.endFrame,
      mode: "reparent",
      wouldChange: true,
    };
  }
  return null;
}

/**
 * Where would the dragged block land on release? Reorder → junction between
 * the two neighbors at the insert index; reparent → full target-parent span.
 */
export function getStructureMoveInsertionSlot(input: {
  tree: TimelineTree;
  itemId: string;
  deltaFrames: number;
  dropFrame: number;
}): StructureInsertionSlot | null {
  const item = input.tree.items.get(input.itemId);
  if (!item) return null;

  const reparent = reparentSlot(input.tree, item, input.dropFrame);
  if (reparent) return reparent;

  const siblings = getSortedSiblings(input.tree, item.parentId);
  if (siblings.length < 2) return null;

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
  const wouldChange = !ordered.every(
    (sibling, index) => sibling.id === siblings[index]!.id,
  );

  const boundary =
    insertIdx === 0 ? others[0]!.startFrame : others[insertIdx - 1]!.endFrame;

  return {
    startFrame: boundary,
    endFrame: boundary,
    mode: "reorder",
    wouldChange,
  };
}

/** Insertion slot when dragging a same-parent multi-selection block. */
export function getStructureGroupMoveInsertionSlot(input: {
  tree: TimelineTree;
  selectedIds: string[];
  anchorItemId: string;
  deltaFrames: number;
}): StructureInsertionSlot | null {
  const anchor = input.tree.items.get(input.anchorItemId);
  if (!anchor) return null;

  const selectedSet = new Set(input.selectedIds);
  const siblings = getSortedSiblings(input.tree, anchor.parentId);
  const block = siblings.filter((s) => selectedSet.has(s.id));
  if (block.length < 2 || siblings.length < 2) return null;

  if (!block.every((item) => item.parentId === anchor.parentId)) return null;

  const others = siblings.filter((s) => !selectedSet.has(s.id));
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
  const wouldChange = !ordered.every(
    (sibling, index) => sibling.id === siblings[index]!.id,
  );

  const boundary =
    insertIdx === 0 ? others[0]!.startFrame : others[insertIdx - 1]!.endFrame;

  return {
    startFrame: boundary,
    endFrame: boundary,
    mode: "reorder",
    wouldChange,
  };
}
