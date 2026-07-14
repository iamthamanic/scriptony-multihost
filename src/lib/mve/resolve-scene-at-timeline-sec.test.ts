/**
 * Unit tests for scene-at-time helpers (T32).
 */

import { describe, expect, it } from "vitest";
import {
  clipTimesAfterSceneMove,
  nextLineOrderIndex,
  nextLineOrderIndexForScene,
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

describe("nextLineOrderIndexForScene", () => {
  it("ignores lines in other scenes and audio-bound lines", () => {
    const order = nextLineOrderIndexForScene(
      [
        { sceneId: "s1", characterId: "c1", orderIndex: 0 },
        { sceneId: "s1", characterId: "c1", orderIndex: 1 },
        { sceneId: "s2", characterId: "c1", orderIndex: 5 },
        {
          sceneId: "s1",
          characterId: "c1",
          audioClipId: "clip-1",
          orderIndex: 9,
        },
      ],
      "s1",
      "c1",
    );
    expect(order).toBe(2);
  });

  it("starts at 0 when no text-only lines exist for character in scene", () => {
    expect(
      nextLineOrderIndexForScene(
        [{ sceneId: "s1", characterId: "c2", orderIndex: 3 }],
        "s1",
        "c1",
      ),
    ).toBe(0);
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
