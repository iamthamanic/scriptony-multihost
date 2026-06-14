/**
 * Per-lane DOM selectors for timeline marquee selection.
 * Location: src/lib/timeline-selection/lane-config.ts
 */

import type { TimelineSelectableKind } from "./types";

export interface TimelineSelectableLaneConfig {
  selector: string;
  readId: (el: HTMLElement) => string | null;
}

export const TIMELINE_SELECTABLE_LANES: Record<
  TimelineSelectableKind,
  TimelineSelectableLaneConfig
> = {
  beat: {
    selector: "[data-beat-id]",
    readId: (el) => el.getAttribute("data-beat-id"),
  },
  act: {
    selector: "[data-act-id]",
    readId: (el) => el.getAttribute("data-act-id"),
  },
  sequence: {
    selector: "[data-sequence-id]",
    readId: (el) => el.getAttribute("data-sequence-id"),
  },
  scene: {
    selector: "[data-scene-id]",
    readId: (el) => el.getAttribute("data-scene-id"),
  },
  shot: {
    selector: "[data-shot-id]",
    readId: (el) => el.getAttribute("data-shot-id"),
  },
};
