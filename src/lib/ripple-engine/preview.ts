/**
 * VETILALORAPP — DOM transform preview (no Act special-case).
 * Location: src/lib/ripple-engine/preview.ts
 */

import type { ItemKind, TimelineTree } from "../timeline-tree/types";

const SELECTOR_BY_KIND: Record<ItemKind, string> = {
  act: "data-act-id",
  sequence: "data-sequence-id",
  scene: "data-scene-id",
  shot: "data-shot-id",
};

export type StructurePreviewContainers = Partial<
  Record<ItemKind, HTMLElement | null>
>;

export interface ApplyStructurePreviewInput {
  containerByKind: StructurePreviewContainers;
  tree: TimelineTree;
  changedIds: Set<string>;
  viewStartFrame: number;
  pxPerFrame: number;
}

function findBlockEl(
  container: HTMLElement,
  kind: ItemKind,
  id: string,
): HTMLElement | null {
  // IDs sind Appwrite-IDs (alphanumerisch + Bindestrich) — kein Escape nötig.
  return container.querySelector<HTMLElement>(
    `[${SELECTOR_BY_KIND[kind]}="${id}"]`,
  );
}

export function applyStructurePreviewToDOM(
  input: ApplyStructurePreviewInput,
): void {
  const { tree, changedIds, viewStartFrame, pxPerFrame } = input;
  if (changedIds.size === 0) return;

  for (const id of changedIds) {
    const item = tree.items.get(id);
    if (!item) continue;
    const container = input.containerByKind[item.kind];
    if (!container) continue;

    const el = findBlockEl(container, item.kind, id);
    if (!el) continue;

    const leftPx = (item.startFrame - viewStartFrame) * pxPerFrame;
    const widthPx = Math.max(2, item.durationFrames * pxPerFrame);

    el.style.left = "0";
    el.style.transform = `translateX(${leftPx}px)`;
    el.style.width = `${widthPx}px`;
  }
}

export interface DragFollowInput {
  containerByKind: StructurePreviewContainers;
  kind: ItemKind;
  id: string;
  leftPx: number;
}

/**
 * Dragged block follows the cursor with a lift effect (CapCut grab feedback);
 * siblings snap via applyStructurePreviewToDOM once the midpoint is crossed.
 */
export function applyStructureDragFollow(input: DragFollowInput): void {
  const container = input.containerByKind[input.kind];
  if (!container) return;
  const el = findBlockEl(container, input.kind, input.id);
  if (!el) return;

  el.style.left = "0";
  el.style.transform = `translateX(${input.leftPx}px)`;
  el.style.zIndex = "40";
  el.style.opacity = "0.85";
  el.style.boxShadow = "0 4px 14px rgba(0,0,0,0.45)";
  el.style.pointerEvents = "none";
}

const STRUCTURE_DIM_OVERLAY_ATTR = "data-structure-dim-overlay";
const STRUCTURE_DROP_ZONE_ATTR = "data-structure-drop-zone";

export interface StructureDropZonePreviewInput {
  structureStackEl: HTMLElement;
  startFrame: number;
  endFrame: number;
  viewStartFrame: number;
  pxPerFrame: number;
}

function ensureStackPositioning(stack: HTMLElement): void {
  if (getComputedStyle(stack).position === "static") {
    stack.style.position = "relative";
  }
}

/** Dims all structure lanes during body-move (drop zone stays brighter on top). */
export function applyStructureDimOverlay(structureStackEl: HTMLElement): void {
  ensureStackPositioning(structureStackEl);
  let dim = structureStackEl.querySelector<HTMLElement>(
    `[${STRUCTURE_DIM_OVERLAY_ATTR}]`,
  );
  if (!dim) {
    dim = document.createElement("div");
    dim.setAttribute(STRUCTURE_DIM_OVERLAY_ATTR, "true");
    dim.setAttribute("aria-hidden", "true");
    dim.className =
      "pointer-events-none absolute inset-0 z-[32] bg-background/55";
    structureStackEl.appendChild(dim);
  }
  dim.style.display = "block";
}

/** Min visible width for the insertion band (junction between two blocks). */
const DROP_ZONE_MIN_WIDTH_PX = 12;

/** Bright white insertion slot — junction band or full reparent column. */
export function applyStructureDropZone(input: StructureDropZonePreviewInput): void {
  const { structureStackEl, startFrame, endFrame, viewStartFrame, pxPerFrame } =
    input;
  ensureStackPositioning(structureStackEl);

  let zone = structureStackEl.querySelector<HTMLElement>(
    `[${STRUCTURE_DROP_ZONE_ATTR}]`,
  );
  if (!zone) {
    zone = document.createElement("div");
    zone.setAttribute(STRUCTURE_DROP_ZONE_ATTR, "true");
    zone.setAttribute("aria-hidden", "true");
    zone.className =
      "pointer-events-none absolute top-0 bottom-0 z-[36] rounded-sm border-2 border-white bg-white/50 shadow-[0_0_12px_rgba(255,255,255,0.85)]";
    structureStackEl.appendChild(zone);
  }

  const rawWidthPx = (endFrame - startFrame) * pxPerFrame;
  const widthPx = Math.max(DROP_ZONE_MIN_WIDTH_PX, rawWidthPx);
  // Narrow junction band: center it on the boundary frame.
  const leftPx =
    (startFrame - viewStartFrame) * pxPerFrame - (widthPx - rawWidthPx) / 2;
  zone.style.left = "0";
  zone.style.transform = `translateX(${leftPx}px)`;
  zone.style.width = `${widthPx}px`;
  zone.style.display = "block";
}

/** Hide only the drop zones (keep dim overlays) — e.g. no-op slot. */
export function clearStructureDropZonesForLanes(
  containerByKind: StructurePreviewContainers,
): void {
  for (const kind of STRUCTURE_LANE_KINDS) {
    const lane = containerByKind[kind];
    if (!lane) continue;
    lane
      .querySelectorAll<HTMLElement>(`[${STRUCTURE_DROP_ZONE_ATTR}]`)
      .forEach((node) => node.remove());
  }
}

const STRUCTURE_LANE_KINDS: ItemKind[] = [
  "act",
  "sequence",
  "scene",
  "shot",
];

export function clearStructureMoveOverlays(
  structureStackEl: HTMLElement | null | undefined,
): void {
  if (!structureStackEl) return;
  structureStackEl
    .querySelectorAll<HTMLElement>(
      `[${STRUCTURE_DIM_OVERLAY_ATTR}], [${STRUCTURE_DROP_ZONE_ATTR}]`,
    )
    .forEach((node) => node.remove());
}

export function clearStructureMoveOverlaysForLanes(
  containerByKind: StructurePreviewContainers,
): void {
  for (const kind of STRUCTURE_LANE_KINDS) {
    clearStructureMoveOverlays(containerByKind[kind]);
  }
}

export function applyStructureDimOverlays(
  containerByKind: StructurePreviewContainers,
): void {
  for (const kind of STRUCTURE_LANE_KINDS) {
    const lane = containerByKind[kind];
    if (lane) applyStructureDimOverlay(lane);
  }
}

export interface StructureDropZoneAcrossLanesInput {
  containerByKind: StructurePreviewContainers;
  startFrame: number;
  endFrame: number;
  viewStartFrame: number;
  pxPerFrame: number;
}

/** Same horizontal drop slot painted on every structure lane (Act…Shot). */
export function applyStructureDropZoneAcrossLanes(
  input: StructureDropZoneAcrossLanesInput,
): void {
  const { containerByKind, startFrame, endFrame, viewStartFrame, pxPerFrame } =
    input;
  for (const kind of STRUCTURE_LANE_KINDS) {
    const lane = containerByKind[kind];
    if (!lane) continue;
    applyStructureDropZone({
      structureStackEl: lane,
      startFrame,
      endFrame,
      viewStartFrame,
      pxPerFrame,
    });
  }
}

function clearStructurePreviewEl(el: HTMLElement): void {
  el.style.transform = "";
  el.style.width = "";
  el.style.left = "";
  el.style.zIndex = "";
  el.style.opacity = "";
  el.style.boxShadow = "";
  el.style.pointerEvents = "";
}

/** When `changedIds` is set, only touched rows are cleared (avoids React style bailout on unchanged siblings). */
export function resetStructurePreviewStyles(
  containerByKind: StructurePreviewContainers,
  changedIds?: Set<string>,
): void {
  clearStructureMoveOverlaysForLanes(containerByKind);

  if (changedIds && changedIds.size > 0) {
    for (const id of changedIds) {
      for (const kind of Object.keys(SELECTOR_BY_KIND) as ItemKind[]) {
        const container = containerByKind[kind];
        if (!container) continue;
        const el = findBlockEl(container, kind, id);
        if (el) {
          clearStructurePreviewEl(el);
          break;
        }
      }
    }
    return;
  }

  for (const kind of Object.keys(SELECTOR_BY_KIND) as ItemKind[]) {
    const container = containerByKind[kind];
    if (!container) continue;
    const nodes = container.querySelectorAll<HTMLElement>(
      `[${SELECTOR_BY_KIND[kind]}]`,
    );
    nodes.forEach(clearStructurePreviewEl);
  }
}
