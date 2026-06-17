/**
 * Book timeline cache shape (acts → chapters → sections). No shots/clips.
 * Location: src/lib/book-timeline-data.ts — lib-only; components re-export for compat (T72).
 */
import type { Act, Scene, Sequence } from "./types";

export interface BookTimelineData {
  acts: Act[];
  sequences: Sequence[];
  scenes: Scene[];
}
