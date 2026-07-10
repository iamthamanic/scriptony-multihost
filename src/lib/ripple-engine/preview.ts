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
const MVE_SCENE_CONTENT_ATTR = "data-mve-scene-id";

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

/** Shared VET insertion slot styling (structure move + MVE text-block drop). */
export const TIMELINE_INSERTION_DROP_ZONE_CLASS =
  "pointer-events-none absolute top-0 bottom-0 z-[36] rounded-sm border-2 border-white bg-white/50 shadow-[0_0_12px_rgba(255,255,255,0.85)]";

function positionDropZoneEl(
  zone: HTMLElement,
  rawWidthPx: number,
  leftPx: number,
): void {
  const widthPx = Math.max(DROP_ZONE_MIN_WIDTH_PX, rawWidthPx);
  zone.style.left = "0";
  zone.style.transform = `translateX(${leftPx}px)`;
  zone.style.width = `${widthPx}px`;
  zone.style.display = "block";
}

function getOrCreateDropZoneEl(stack: HTMLElement): HTMLElement {
  let zone = stack.querySelector<HTMLElement>(`[${STRUCTURE_DROP_ZONE_ATTR}]`);
  if (!zone) {
    zone = document.createElement("div");
    zone.setAttribute(STRUCTURE_DROP_ZONE_ATTR, "true");
    zone.setAttribute("aria-hidden", "true");
    zone.className = TIMELINE_INSERTION_DROP_ZONE_CLASS;
    stack.appendChild(zone);
  }
  return zone;
}

/** Bright white insertion slot — junction band or full reparent column. */
export function applyStructureDropZone(
  input: StructureDropZonePreviewInput,
): void {
  const { structureStackEl, startFrame, endFrame, viewStartFrame, pxPerFrame } =
    input;
  ensureStackPositioning(structureStackEl);

  const zone = getOrCreateDropZoneEl(structureStackEl);
  const rawWidthPx = (endFrame - startFrame) * pxPerFrame;
  const widthPx = Math.max(DROP_ZONE_MIN_WIDTH_PX, rawWidthPx);
  const leftPx =
    (startFrame - viewStartFrame) * pxPerFrame - (widthPx - rawWidthPx) / 2;
  positionDropZoneEl(zone, rawWidthPx, leftPx);
}

export interface TimelineDropZoneSecInput {
  stackEl: HTMLElement;
  startSec: number;
  endSec: number;
  viewStartSec: number;
  pxPerSec: number;
}

/** Same white slot using timeline seconds (audio / MVE dialog lanes). */
export function applyTimelineDropZoneSec(
  input: TimelineDropZoneSecInput,
): void {
  const { stackEl, startSec, endSec, viewStartSec, pxPerSec } = input;
  ensureStackPositioning(stackEl);
  const zone = getOrCreateDropZoneEl(stackEl);
  const rawWidthPx = (endSec - startSec) * pxPerSec;
  const widthPx = Math.max(DROP_ZONE_MIN_WIDTH_PX, rawWidthPx);
  const leftPx =
    (startSec - viewStartSec) * pxPerSec - (widthPx - rawWidthPx) / 2;
  positionDropZoneEl(zone, rawWidthPx, leftPx);
}

/** Hide only the drop zones (keep dim overlays) — e.g. no-op slot. */
export function clearStructureDropZonesForLanes(
  containerByKind: StructurePreviewContainers,
  extraStacks: Array<HTMLElement | null | undefined> = [],
): void {
  for (const kind of STRUCTURE_LANE_KINDS) {
    const lane = containerByKind[kind];
    if (!lane) continue;
    lane
      .querySelectorAll<HTMLElement>(`[${STRUCTURE_DROP_ZONE_ATTR}]`)
      .forEach((node) => node.remove());
  }
  clearStructureDropZonesOnExtraStacks(extraStacks);
}

export function clearStructureDropZonesOnExtraStacks(
  stacks: Array<HTMLElement | null | undefined>,
): void {
  for (const stack of stacks) {
    clearStructureMoveOverlays(stack ?? undefined);
  }
  resetMveSceneContentDragFollow(stacks);
}

const STRUCTURE_LANE_KINDS: ItemKind[] = ["act", "sequence", "scene", "shot"];

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
  /** Audio dialog stack(s) — same horizontal slot as structure lanes. */
  extraDropZoneStacks?: Array<HTMLElement | null | undefined>;
}

/** Same horizontal drop slot painted on every structure lane (Act…Shot). */
export function applyStructureDropZoneAcrossLanes(
  input: StructureDropZoneAcrossLanesInput,
): void {
  const {
    containerByKind,
    startFrame,
    endFrame,
    viewStartFrame,
    pxPerFrame,
    extraDropZoneStacks = [],
  } = input;
  const slot = { startFrame, endFrame, viewStartFrame, pxPerFrame };
  for (const kind of STRUCTURE_LANE_KINDS) {
    const lane = containerByKind[kind];
    if (!lane) continue;
    applyStructureDropZone({
      structureStackEl: lane,
      ...slot,
    });
  }
  for (const stack of extraDropZoneStacks) {
    if (!stack) continue;
    applyStructureDropZone({
      structureStackEl: stack,
      ...slot,
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

/** Mirror structure scene drag on MVE text blocks + dialog clips in audio lanes. */
export function applyMveSceneContentDragFollow(input: {
  audioLaneStacks: Array<HTMLElement | null | undefined>;
  sceneId: string;
  offsetPx: number;
}): void {
  for (const stack of input.audioLaneStacks) {
    if (!stack) continue;
    const nodes = stack.querySelectorAll<HTMLElement>(
      `[${MVE_SCENE_CONTENT_ATTR}]`,
    );
    for (const el of nodes) {
      if (el.getAttribute(MVE_SCENE_CONTENT_ATTR) !== input.sceneId) continue;
      el.style.transform = `translateX(${input.offsetPx}px)`;
    }
  }
}

export function resetMveSceneContentDragFollow(
  audioLaneStacks: Array<HTMLElement | null | undefined>,
): void {
  for (const stack of audioLaneStacks) {
    if (!stack) continue;
    stack
      .querySelectorAll<HTMLElement>(`[${MVE_SCENE_CONTENT_ATTR}]`)
      .forEach(clearStructurePreviewEl);
  }
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
