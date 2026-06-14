/**
 * Timeline marquee selection — beat lane solo; structure lanes cross-track.
 * Location: src/lib/timeline-selection/types.ts
 */

export type TimelineSelectableKind =
  | "beat"
  | "act"
  | "sequence"
  | "scene"
  | "shot";

export type TimelineInteractionMode = "select" | "move";

export interface TimelineSelectionState {
  beats: Set<string>;
  acts: Set<string>;
  sequences: Set<string>;
  scenes: Set<string>;
  shots: Set<string>;
}

export interface MarqueeRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const TIMELINE_KIND_STATE_KEY: Record<
  TimelineSelectableKind,
  keyof TimelineSelectionState
> = {
  beat: "beats",
  act: "acts",
  sequence: "sequences",
  scene: "scenes",
  shot: "shots",
};

export const BEAT_MARQUEE_KINDS = [
  "beat",
] as const satisfies readonly TimelineSelectableKind[];

export const STRUCTURE_MARQUEE_KINDS = [
  "act",
  "sequence",
  "scene",
  "shot",
] as const satisfies readonly TimelineSelectableKind[];

export const EMPTY_TIMELINE_SELECTION: TimelineSelectionState = {
  beats: new Set(),
  acts: new Set(),
  sequences: new Set(),
  scenes: new Set(),
  shots: new Set(),
};

export function timelineSelectionCount(state: TimelineSelectionState): number {
  return (
    state.beats.size +
    state.acts.size +
    state.sequences.size +
    state.scenes.size +
    state.shots.size
  );
}

export function timelineSelectionCountForKinds(
  state: TimelineSelectionState,
  kinds: readonly TimelineSelectableKind[],
): number {
  return kinds.reduce(
    (n, kind) => n + state[TIMELINE_KIND_STATE_KEY[kind]].size,
    0,
  );
}

export function timelineSelectionIsEmpty(
  state: TimelineSelectionState,
): boolean {
  return timelineSelectionCount(state) === 0;
}

export function timelineSelectionIsEmptyForKinds(
  state: TimelineSelectionState,
  kinds: readonly TimelineSelectableKind[],
): boolean {
  return timelineSelectionCountForKinds(state, kinds) === 0;
}

export function cloneTimelineSelection(
  state: TimelineSelectionState,
): TimelineSelectionState {
  return {
    beats: new Set(state.beats),
    acts: new Set(state.acts),
    sequences: new Set(state.sequences),
    scenes: new Set(state.scenes),
    shots: new Set(state.shots),
  };
}

export function isClipSelected(
  state: TimelineSelectionState,
  kind: TimelineSelectableKind,
  id: string,
): boolean {
  return state[TIMELINE_KIND_STATE_KEY[kind]].has(id);
}
