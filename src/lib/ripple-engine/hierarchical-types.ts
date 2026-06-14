/**
 * VETILALORAPP — input types for hierarchical structure resize.
 * Location: src/lib/ripple-engine/hierarchical-types.ts
 */

import type {
  StructureTrimOperation,
  TimelineTree,
  TrimSide,
} from "../timeline-tree/types";

export interface ResizeStructureItemInput {
  tree: TimelineTree;
  itemId: string;
  side: TrimSide;
  operation?: StructureTrimOperation;
  newBoundaryFrame: number;
  snapEdgesFrame?: number[];
  snapThresholdFrames?: number;
  minItemDurationFrames?: number;
}
