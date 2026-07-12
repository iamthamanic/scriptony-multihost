/**
 * Film timeline cache shape (acts → sequences → scenes → shots/clips).
 * Shared by UI, api-adapter, and lib/timeline-tree — no component imports in lib.
 */
import type { Act, Clip, Scene, Sequence, Shot } from "./types";

export interface TimelineData {
  acts: Act[];
  sequences: Sequence[];
  scenes: Scene[];
  /** Film projects only; omitted for book timelines. */
  shots?: Shot[];
  /** Editorial clips (film timeline); optional for older caches. */
  clips?: Clip[];
  /**
   * VETILALORAPP: ruler length used when decoding act pct after trim/move commit.
   * Prevents snap-back when stored project duration lags elastic grow by one render.
   */
  layoutProjectDurationSec?: number;
}
