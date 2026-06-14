/**
 * Playhead scrub helpers — clientX → timeline seconds (CapCut-style absolute seek).
 * Location: src/hooks/timeline/timeline-scrub-utils.ts
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
): number {
  if (pxPerSec <= 0) return 0;
  const rect = scrollEl.getBoundingClientRect();
  const localX = clientX - rect.left;
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
