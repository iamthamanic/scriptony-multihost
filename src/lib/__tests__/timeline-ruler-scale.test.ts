import { describe, expect, it } from "vitest";
import {
  formatTimelineTimeLabel,
  resolveMajorStepSec,
  resolveMinorStepSec,
  resolveRulerScale,
} from "../timeline-ruler-scale";

describe("timeline-ruler-scale", () => {
  it("formats time labels as MM:SS or H:MM:SS", () => {
    expect(formatTimelineTimeLabel(0)).toBe("0:00");
    expect(formatTimelineTimeLabel(65)).toBe("1:05");
    expect(formatTimelineTimeLabel(3661)).toBe("1:01:01");
  });

  it("picks major step from label spacing", () => {
    expect(resolveMajorStepSec(200)).toBe(1);
    expect(resolveMajorStepSec(50)).toBe(2);
    expect(resolveMajorStepSec(10)).toBe(10);
    expect(resolveMajorStepSec(1)).toBe(120);
  });

  it("picks finest minor step as divisor of major with minimum pixel spacing", () => {
    expect(resolveMinorStepSec(10, 50)).toBe(1);
    expect(resolveMinorStepSec(60, 20)).toBe(1);
    expect(resolveMinorStepSec(600, 0.01)).toBeNull();
  });

  it("builds major and minor ticks without duplicate positions", () => {
    const { majorTicks, minorTicks, majorStepSec, minorStepSec } =
      resolveRulerScale({
        pxPerSec: 50,
        viewStartSec: 0,
        viewEndSec: 30,
      });

    expect(majorStepSec).toBe(2);
    expect(minorStepSec).toBe(1);
    expect(majorTicks.map((t) => t.sec)).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30]);
    expect(minorTicks.every((t) => t.sec % majorStepSec !== 0)).toBe(true);
    expect(minorTicks.some((t) => t.sec === 1)).toBe(true);
  });
});
