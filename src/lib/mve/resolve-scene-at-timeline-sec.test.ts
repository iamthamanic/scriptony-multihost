/**
 * Unit tests for scene-at-time helpers (T32).
 */

import { describe, expect, it } from "vitest";
import {
  clipTimesAfterSceneMove,
  nextLineOrderIndex,
  resolveSceneIdAtTimelineSec,
  timelineSecFromPointer,
} from "./resolve-scene-at-timeline-sec";

const scenes = [
  { id: "s1", startSec: 0, endSec: 10 },
  { id: "s2", startSec: 10, endSec: 25 },
];

describe("resolveSceneIdAtTimelineSec", () => {
  it("returns scene id for time inside block", () => {
    expect(resolveSceneIdAtTimelineSec(5, scenes)).toBe("s1");
    expect(resolveSceneIdAtTimelineSec(12, scenes)).toBe("s2");
  });

  it("returns undefined outside all scenes", () => {
    expect(resolveSceneIdAtTimelineSec(99, scenes)).toBeUndefined();
  });
});

describe("timelineSecFromPointer", () => {
  it("maps client x to timeline seconds", () => {
    expect(timelineSecFromPointer(150, 100, 0, 10)).toBe(5);
  });
});

describe("nextLineOrderIndex", () => {
  it("increments max order in target scene", () => {
    expect(nextLineOrderIndex([{ orderIndex: 0 }, { orderIndex: 2 }])).toBe(3);
    expect(nextLineOrderIndex([])).toBe(0);
  });
});

describe("clipTimesAfterSceneMove", () => {
  it("anchors clip at target scene start preserving duration", () => {
    expect(clipTimesAfterSceneMove(3, 8, scenes[1]!)).toEqual({
      startSec: 10,
      endSec: 15,
    });
  });
});
