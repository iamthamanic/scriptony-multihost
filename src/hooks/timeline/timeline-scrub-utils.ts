/**
 * Playhead scrub helpers — clientX → timeline seconds (CapCut-style absolute seek).
 * Location: src/hooks/timeline/timeline-scrub-utils.ts
 *
 * Coordinate model: time-positioned elements (blocks, ruler ticks, playhead)
 * render window-relative — `x = (t − scrollLeft/pxPerSec) · pxPerSec` — inside
 * the horizontally scrolled content. Pointer mapping must therefore anchor on
 * the element where timeline t=0 lives (`contentOriginEl`, scrolls with the
 * content). When no origin element is provided, the scroll container itself is
 * the legacy anchor; both are equivalent while the timeline content starts at
 * the container's left edge and scrollLeft is 0. With sticky row labels inside
 * the scroller, only the content-origin anchor stays correct.
 */

export function clampTimelineTimeSec(
  timeSec: number,
  durationSec: number,
): number {
  const maxSec = Math.max(1e-6, durationSec);
  return Math.max(0, Math.min(maxSec, timeSec));
}

export function timeSecFromTimelineClientX(
  clientX: number,
  scrollEl: HTMLElement,
  pxPerSec: number,
  durationSec: number,
  contentOriginEl?: HTMLElement | null,
): number {
  if (pxPerSec <= 0) return 0;
  const anchorEl = contentOriginEl ?? scrollEl;
  const localX = clientX - anchorEl.getBoundingClientRect().left;
  const raw = (scrollEl.scrollLeft + localX) / pxPerSec;
  return clampTimelineTimeSec(raw, durationSec);
}

export function playheadLeftPxFromTimeSec(
  timeSec: number,
  scrollEl: HTMLElement,
  pxPerSec: number,
): number {
  const viewStartSec = scrollEl.scrollLeft / pxPerSec;
  return (timeSec - viewStartSec) * pxPerSec;
}
