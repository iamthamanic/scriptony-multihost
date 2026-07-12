/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import {
  normalizeMarqueeRect,
  queryClipIdsInMarquee,
  rectsOverlap,
} from "../hit-test";

describe("timeline-selection hit-test", () => {
  it("normalizeMarqueeRect handles any drag direction", () => {
    expect(normalizeMarqueeRect(10, 20, 30, 40)).toEqual({
      left: 10,
      top: 20,
      width: 20,
      height: 20,
    });
    expect(normalizeMarqueeRect(30, 40, 10, 20)).toEqual({
      left: 10,
      top: 20,
      width: 20,
      height: 20,
    });
  });

  it("rectsOverlap detects partial intersection", () => {
    const a = { left: 0, top: 0, width: 10, height: 10 };
    const b = { left: 5, top: 5, width: 10, height: 10 };
    const c = { left: 20, top: 20, width: 5, height: 5 };
    expect(rectsOverlap(a, b)).toBe(true);
    expect(rectsOverlap(a, c)).toBe(false);
  });

  it("queryClipIdsInMarquee selects partially overlapped clips", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () =>
        ({
          left: 0,
          top: 0,
          width: 200,
          height: 40,
          right: 200,
          bottom: 40,
        }) as DOMRect,
    });

    const clipA = document.createElement("div");
    clipA.setAttribute("data-beat-id", "a");
    Object.defineProperty(clipA, "getBoundingClientRect", {
      value: () =>
        ({
          left: 0,
          top: 0,
          width: 30,
          height: 30,
          right: 30,
          bottom: 30,
        }) as DOMRect,
    });

    const clipB = document.createElement("div");
    clipB.setAttribute("data-beat-id", "b");
    Object.defineProperty(clipB, "getBoundingClientRect", {
      value: () =>
        ({
          left: 80,
          top: 0,
          width: 30,
          height: 30,
          right: 110,
          bottom: 30,
        }) as DOMRect,
    });

    container.append(clipA, clipB);

    const hits = queryClipIdsInMarquee(container, "beat", {
      left: 20,
      top: 0,
      width: 70,
      height: 30,
    });

    expect(hits.sort()).toEqual(["a", "b"]);
  });
});
