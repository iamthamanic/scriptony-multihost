/**
 * Timeline zoom math (fit px/s, zoom↔px mapping, stable scale on duration change).
 * Location: src/lib/timeline-zoom.ts
 *
 * VETILALORAPP snap-back fix: when an elastic trim grows the project duration,
 * the ruler must get longer at the SAME px/s — re-fitting the zoom rescales all
 * blocks toward the left and the dragged edge visually "snaps back".
 */

export const MAX_PX_PER_SEC = 200;
export const FALLBACK_MIN_PX_PER_SEC = 2;

/** Minimum px/s so the entire timeline fits the viewport (zoom = 0). */
export function getFitPxPerSec(
  totalDurationSec: number,
  viewportWidthPx: number,
): number {
  if (totalDurationSec <= 0 || viewportWidthPx <= 0) {
    return FALLBACK_MIN_PX_PER_SEC;
  }
  return viewportWidthPx / totalDurationSec;
}

/** zoom 0 → fitPxPerSec (whole timeline), zoom 1 → MAX_PX_PER_SEC (exponential). */
export function pxPerSecFromZoom(zoom: number, fitPxPerSec: number): number {
  const minPx = fitPxPerSec;
  const ratio = MAX_PX_PER_SEC / minPx;
  return minPx * Math.pow(ratio, zoom);
}

/** Inverse of pxPerSecFromZoom. */
export function zoomFromPxPerSec(px: number, fitPxPerSec: number): number {
  const minPx = fitPxPerSec;
  const ratio = MAX_PX_PER_SEC / minPx;
  return Math.log(px / minPx) / Math.log(ratio);
}

export interface StableZoomResult {
  pxPerSec: number;
  zoom: number;
}

/**
 * Fit minimum changed after initial setup (elastic trim grow, viewport resize).
 * Keep the current px/s so committed blocks don't visually shift; only clamp up
 * to the new fit minimum and remap the zoom slider position.
 */
export function stableZoomOnFitChange(
  currentPxPerSec: number,
  newFitPxPerSec: number,
): StableZoomResult {
  const pxPerSec = Math.min(
    MAX_PX_PER_SEC,
    Math.max(currentPxPerSec, newFitPxPerSec),
  );
  const zoom = Math.min(
    1,
    Math.max(0, zoomFromPxPerSec(pxPerSec, newFitPxPerSec)),
  );
  return { pxPerSec, zoom };
}
