/**
 * Unit tests for resize-scene-for-content helpers.
 */

import { describe, it, expect } from "vitest";
import {
  clipRippleFromSceneStartShifts,
  computeSceneResizeDelta,
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
