/**
 * Unit tests for resize-scene-for-content helpers.
 */

import { describe, it, expect } from "vitest";
import {
  clipRippleFromSceneStartShifts,
  computeSceneResizeDelta,
  rippleClipsForSceneGrow,
} from "../resize-scene-for-content";

describe("computeSceneResizeDelta", () => {
  it("returns positive delta when growing", () => {
    expect(computeSceneResizeDelta(10, 15)).toBe(5);
  });

  it("returns negative delta when shrinking", () => {
    expect(computeSceneResizeDelta(30, 10)).toBe(-20);
  });

  it("returns 0 when equal", () => {
    expect(computeSceneResizeDelta(10, 10)).toBe(0);
  });
});

describe("rippleClipsForSceneGrow", () => {
  it("sets changed clip end to required end instead of capping to scene", () => {
    const clips = [
      { id: "c1", sceneId: "s1", startSec: 0, endSec: 5 },
      { id: "c2", sceneId: "s1", startSec: 0, endSec: 10 },
    ];
    const result = rippleClipsForSceneGrow("c1", 27, clips);
    expect(result.find((c) => c.id === "c1")?.endSec).toBe(27);
    expect(result.find((c) => c.id === "c2")?.endSec).toBe(10);
  });
});

describe("clipRippleFromSceneStartShifts", () => {
  it("shifts clips when scene start moves", () => {
    const result = clipRippleFromSceneStartShifts(
      [
        {
          id: "s2",
          startSec: 30,
          endSec: 60,
          durationSec: 30,
          orderIndex: 1,
          sequenceId: "sq1",
        },
      ],
      [
        {
          id: "s2",
          startSec: 20,
          endSec: 50,
          durationSec: 30,
          orderIndex: 1,
          sequenceId: "sq1",
        },
      ],
      [
        {
          id: "c1",
          sceneId: "s2",
          startSec: 30,
          endSec: 35,
        },
      ],
    );
    expect(result.updatedClips[0]?.startSec).toBe(20);
    expect(result.updatedClips[0]?.endSec).toBe(25);
  });
});
