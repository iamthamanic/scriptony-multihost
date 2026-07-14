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

  it("anchors on the content origin element when provided (sticky labels)", () => {
    // Scroller starts at viewport x=50; sticky label column is 248px wide, so
    // timeline t=0 (content origin, unscrolled) sits at 50 + 248 = 298.
    const scrollEl = {
      scrollLeft: 0,
      getBoundingClientRect: () => ({ left: 50 }),
    } as unknown as HTMLElement;
    const contentOriginEl = {
      getBoundingClientRect: () => ({ left: 298 }),
    } as unknown as HTMLElement;

    // Click 100px right of the content origin → 1s at 100 px/s.
    expect(
      timeSecFromTimelineClientX(398, scrollEl, 100, 60, contentOriginEl),
    ).toBe(1);
    // Same clientX without origin anchor would be wrong (includes label width).
    expect(timeSecFromTimelineClientX(398, scrollEl, 100, 60)).toBe(3.48);
  });

  it("content origin anchor matches window-relative block rendering when scrolled", () => {
    // scrollLeft=200 → viewStart=2s. The origin element scrolls with content:
    // its rect.left = scroller.left + labelWidth − scrollLeft = 50+248−200 = 98.
    const scrollEl = {
      scrollLeft: 200,
      getBoundingClientRect: () => ({ left: 50 }),
    } as unknown as HTMLElement;
    const contentOriginEl = {
      getBoundingClientRect: () => ({ left: 98 }),
    } as unknown as HTMLElement;

    // A block at t=10s renders window-relative at (10−2)·100 = 800px from the
    // origin → clientX = 98 + 800 = 898. Mapping must return exactly 10s.
    expect(
      timeSecFromTimelineClientX(898, scrollEl, 100, 60, contentOriginEl),
    ).toBe(10);
  });

  it("computes playhead px from time and scroll", () => {
    const scrollEl = {
      scrollLeft: 500,
    } as unknown as HTMLElement;

    expect(playheadLeftPxFromTimeSec(10, scrollEl, 100)).toBe(500);
  });
});
