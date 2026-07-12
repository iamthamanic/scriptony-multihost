/**
 * VETILALORAPP — canonical timeline model (frames, not pct).
 * Location: src/lib/timeline-tree/types.ts
 *
 * `TimelineData` lebt in `lib/timeline-data.ts` (kein UI-Import).
 * Domain-Module unter `lib/timeline-tree/*` dürfen ihn nur lesen, nicht mutieren.
 * Boundary-Funktion ist `buildTimelineTree({ timelineData, ... })`.
 */
export type { TimelineData } from "../timeline-data";

export type ItemKind = "act" | "sequence" | "scene" | "shot";

export type StructureTrimOperation =
  | "ripple-resize"
  | "roll-boundary"
  | "shell-resize";

export type TrimSide = "left" | "right";

export interface TimelineItem {
  id: string;
  kind: ItemKind;
  /** null only for root acts */
  parentId: string | null;
  orderIndex: number;
  startFrame: number;
  endFrame: number;
  durationFrames: number;
  locked?: boolean;
}

export interface TimelineTree {
  items: Map<string, TimelineItem>;
  childrenOf: Map<string | null, TimelineItem[]>;
  projectDurationFrames: number;
  frameRate: number;
}

export const DEFAULT_FRAME_RATE = 30;
export const DEFAULT_MIN_ITEM_DURATION_FRAMES = 30;
export const DEFAULT_SNAP_THRESHOLD_FRAMES = 5;

export function secToFrame(sec: number, frameRate: number): number {
  return Math.round(sec * frameRate);
}

export function frameToSec(frame: number, frameRate: number): number {
  return frame / frameRate;
}

export function syncItemDuration(item: TimelineItem): void {
  item.durationFrames = Math.max(0, item.endFrame - item.startFrame);
}

export type InvariantCode =
  | "negative_duration"
  | "below_min_duration"
  | "sibling_overlap"
  | "implicit_gap"
  | "child_outside_parent"
  | "parent_hull_mismatch"
  | "duplicate_id"
  | "parent_cycle";

export interface TimelineInvariantError {
  code: InvariantCode;
  message: string;
  itemId?: string;
}

export interface RippleResult {
  before: TimelineTree;
  next: TimelineTree;
  changedIds: Set<string>;
  blocked: boolean;
  blockReason?: "locked" | "locked_ripple" | "would_violate_invariant";
  /** Populated when blocked with would_violate_invariant (dev diagnostics). */
  invariantErrors?: TimelineInvariantError[];
}
