/**
 * Beat-lane body-move DOM preview (follow cursor + insertion slot).
 * Location: src/lib/beats/beat-move-preview.ts
 */

const BEAT_DIM_OVERLAY_ATTR = "data-beat-dim-overlay";
const BEAT_DROP_ZONE_ATTR = "data-beat-drop-zone";

function ensureRelativePositioning(el: HTMLElement): void {
  if (getComputedStyle(el).position === "static") {
    el.style.position = "relative";
  }
}

export function applyBeatDimOverlay(container: HTMLElement): void {
  ensureRelativePositioning(container);
  let dim = container.querySelector<HTMLElement>(`[${BEAT_DIM_OVERLAY_ATTR}]`);
  if (!dim) {
    dim = document.createElement("div");
    dim.setAttribute(BEAT_DIM_OVERLAY_ATTR, "true");
    dim.setAttribute("aria-hidden", "true");
    dim.className =
      "pointer-events-none absolute inset-0 z-[32] bg-background/55";
    container.appendChild(dim);
  }
  dim.style.display = "block";
}

export function applyBeatDragFollow(
  container: HTMLElement,
  beatId: string,
  leftPx: number,
): void {
  const el = container.querySelector<HTMLElement>(`[data-beat-id="${beatId}"]`);
  if (!el) return;
  el.style.left = "0";
  el.style.transform = `translateX(${leftPx}px)`;
  el.style.zIndex = "40";
  el.style.opacity = "0.85";
  el.style.boxShadow = "0 4px 14px rgba(0,0,0,0.45)";
  el.style.pointerEvents = "none";
}

const DROP_ZONE_MIN_WIDTH_PX = 12;

export function applyBeatDropZone(input: {
  container: HTMLElement;
  boundarySec: number;
  durationSec: number;
  viewStartSec: number;
  pxPerSec: number;
}): void {
  const { container, boundarySec, durationSec, viewStartSec, pxPerSec } = input;
  ensureRelativePositioning(container);

  let zone = container.querySelector<HTMLElement>(`[${BEAT_DROP_ZONE_ATTR}]`);
  if (!zone) {
    zone = document.createElement("div");
    zone.setAttribute(BEAT_DROP_ZONE_ATTR, "true");
    zone.setAttribute("aria-hidden", "true");
    zone.className =
      "pointer-events-none absolute top-0 bottom-0 z-[36] rounded-sm border-2 border-white bg-white/50 shadow-[0_0_12px_rgba(255,255,255,0.85)]";
    container.appendChild(zone);
  }

  const boundaryPct = durationSec > 0 ? (boundarySec / durationSec) * 100 : 0;
  const rawWidthPx = (1 / 100) * durationSec * pxPerSec;
  const widthPx = Math.max(DROP_ZONE_MIN_WIDTH_PX, rawWidthPx);
  const centerPx = (boundaryPct / 100) * durationSec * pxPerSec;
  const leftPx = centerPx - viewStartSec * pxPerSec - widthPx / 2;

  zone.style.left = "0";
  zone.style.transform = `translateX(${leftPx}px)`;
  zone.style.width = `${widthPx}px`;
  zone.style.display = "block";
}

function clearBeatPreviewEl(el: HTMLElement): void {
  el.style.left = "";
  el.style.transform = "";
  el.style.zIndex = "";
  el.style.opacity = "";
  el.style.boxShadow = "";
  el.style.pointerEvents = "";
}

/** Remove dim + drop zone only (keep clip styles). */
export function clearBeatMoveOverlays(container: HTMLElement | null): void {
  if (!container) return;
  container
    .querySelectorAll<HTMLElement>(`[${BEAT_DIM_OVERLAY_ATTR}]`)
    .forEach((el) => {
      el.remove();
    });
  container
    .querySelectorAll<HTMLElement>(`[${BEAT_DROP_ZONE_ATTR}]`)
    .forEach((el) => {
      el.remove();
    });
}

/**
 * Selective reset — only touched beats (avoids React style bailout on siblings).
 * Mirrors resetStructurePreviewStyles in ripple-engine/preview.ts.
 */
/** Clear beat-lane trim/move preview styles (all ids from trim snapshot). */
export function resetBeatLanePreviewStyles(
  container: HTMLElement | null,
  beatIds?: Set<string>,
): void {
  resetBeatMovePreviewStyles(container, beatIds);
}

/** @deprecated Use resetBeatLanePreviewStyles */
export function resetBeatMovePreviewStyles(
  container: HTMLElement | null,
  beatIds?: Set<string>,
): void {
  clearBeatMoveOverlays(container);
  if (!container) return;

  if (beatIds && beatIds.size > 0) {
    for (const id of beatIds) {
      const el = container.querySelector<HTMLElement>(`[data-beat-id="${id}"]`);
      if (el) clearBeatPreviewEl(el);
    }
    return;
  }

  container.querySelectorAll<HTMLElement>("[data-beat-id]").forEach((el) => {
    clearBeatPreviewEl(el);
  });
}

/** @deprecated Use resetBeatMovePreviewStyles with beatIds instead. */
export function clearBeatMovePreview(container: HTMLElement | null): void {
  resetBeatMovePreviewStyles(container);
}
