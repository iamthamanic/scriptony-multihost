import { describe, expect, it } from "vitest";
import {
  clampTimelineTimeSec,
  playheadLeftPxFromTimeSec,
  timeSecFromTimelineClientX,
} from "../timeline-scrub-utils";

describe("timeline-scrub-utils", () => {
  it("clamps time to duration", () => {
    expect(clampTimelineTimeSec(99, 10)).toBe(10);
    expect(clampTimelineTimeSec(-1, 10)).toBe(0);
  });

  it("maps clientX to timeline seconds with scroll offset", () => {
    const scrollEl = {
      scrollLeft: 200,
      getBoundingClientRect: () => ({ left: 50 }),
    } as unknown as HTMLElement;

    expect(timeSecFromTimelineClientX(150, scrollEl, 100, 60)).toBe(3);
  });

  it("computes playhead px from time and scroll", () => {
    const scrollEl = {
      scrollLeft: 500,
    } as unknown as HTMLElement;

    expect(playheadLeftPxFromTimeSec(10, scrollEl, 100)).toBe(500);
  });
});
