import { describe, it, expect } from "vitest";
import { resolveSceneIdForTimeline } from "../timeline-add-audio";
import {
  DEFAULT_VISIBLE_LANE_INDICES,
  mergeVisibleLaneIndices,
} from "../audio-lane";

describe("timeline-add-audio", () => {
  it("resolves scene at playhead from timing", () => {
    const id = resolveSceneIdForTimeline(
      [
        { id: "a", orderIndex: 0 },
        { id: "b", orderIndex: 1 },
      ],
      15,
      [
        { id: "a", startSec: 0, endSec: 10 },
        { id: "b", startSec: 10, endSec: 30 },
      ],
    );
    expect(id).toBe("b");
  });

  it("falls back to first scene by order", () => {
    const id = resolveSceneIdForTimeline(
      [
        { id: "z", orderIndex: 2 },
        { id: "a", orderIndex: 0 },
      ],
      999,
    );
    expect(id).toBe("a");
  });
});

describe("mergeVisibleLaneIndices import", () => {
  it("re-exports default lanes", () => {
    expect(DEFAULT_VISIBLE_LANE_INDICES).toEqual([100]);
    expect(mergeVisibleLaneIndices([110])).toContain(100);
  });
});
