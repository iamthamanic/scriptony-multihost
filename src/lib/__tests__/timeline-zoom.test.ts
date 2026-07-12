/**
 * Snap-back regression: elastic duration grow must NOT rescale px/s.
 * Old behavior re-fitted zoom → dragged edge rendered back at its old pixel.
 */
import { describe, expect, it } from "vitest";
import {
  getFitPxPerSec,
  pxPerSecFromZoom,
  stableZoomOnFitChange,
  zoomFromPxPerSec,
  MAX_PX_PER_SEC,
} from "../timeline-zoom";

const VIEWPORT = 1200;

describe("timeline zoom (snap-back regression)", () => {
  it("OLD refit behavior puts the grown project end back at the viewport edge", () => {
    const oldDurationSec = 31020; // 517 min
    const grownDurationSec = 38160; // 636 min (from user logs)

    const fitOld = getFitPxPerSec(oldDurationSec, VIEWPORT);
    // zoom = 0 → project end at viewport edge
    expect(oldDurationSec * pxPerSecFromZoom(0, fitOld)).toBeCloseTo(VIEWPORT);

    // Refit after grow (old buggy behavior): end is AGAIN exactly at viewport edge
    const fitGrown = getFitPxPerSec(grownDurationSec, VIEWPORT);
    const refitPx = pxPerSecFromZoom(0, fitGrown);
    expect(grownDurationSec * refitPx).toBeCloseTo(VIEWPORT);
    // → visually identical to before the drag = full snap-back
  });

  it("stableZoomOnFitChange keeps px/s when duration grows", () => {
    const fitOld = getFitPxPerSec(31020, VIEWPORT);
    const currentPx = pxPerSecFromZoom(0, fitOld);

    const fitGrown = getFitPxPerSec(38160, VIEWPORT);
    const { pxPerSec, zoom } = stableZoomOnFitChange(currentPx, fitGrown);

    expect(pxPerSec).toBeCloseTo(currentPx); // scale unchanged → no visual shift
    expect(zoom).toBeGreaterThan(0); // slider remapped instead
    expect(zoom).toBeLessThanOrEqual(1);
    // Dragged edge stays where it was dropped:
    const draggedEndSec = 38160;
    expect(draggedEndSec * pxPerSec).toBeGreaterThan(VIEWPORT);
  });

  it("keeps px/s stable at a zoomed-in level too", () => {
    const fitOld = getFitPxPerSec(31020, VIEWPORT);
    const currentPx = pxPerSecFromZoom(0.5, fitOld);

    const fitGrown = getFitPxPerSec(38160, VIEWPORT);
    const { pxPerSec } = stableZoomOnFitChange(currentPx, fitGrown);

    expect(pxPerSec).toBeCloseTo(currentPx);
  });

  it("clamps up to new fit when duration shrinks below current scale", () => {
    const fitOld = getFitPxPerSec(38160, VIEWPORT);
    const currentPx = pxPerSecFromZoom(0, fitOld); // fully zoomed out

    const fitShrunk = getFitPxPerSec(31020, VIEWPORT); // larger fit minimum
    const { pxPerSec, zoom } = stableZoomOnFitChange(currentPx, fitShrunk);

    expect(pxPerSec).toBeCloseTo(fitShrunk);
    expect(zoom).toBe(0);
  });

  it("zoom↔px mapping round-trips", () => {
    const fit = getFitPxPerSec(31020, VIEWPORT);
    for (const z of [0, 0.25, 0.5, 0.75, 1]) {
      const px = pxPerSecFromZoom(z, fit);
      expect(zoomFromPxPerSec(px, fit)).toBeCloseTo(z, 6);
    }
    expect(pxPerSecFromZoom(1, fit)).toBeCloseTo(MAX_PX_PER_SEC);
  });
});
