/**
 * Structure timeline panel height — defaults, clamp, localStorage (per project).
 * Location: src/lib/structure/structure-timeline-panel-height.ts
 */

import { isAudioProjectType } from "@/lib/project-type-audio";

export const STRUCTURE_TIMELINE_PANEL_MIN_PX = 420;
/** Soft cap for very large displays; primary limit is viewport ratio. */
export const STRUCTURE_TIMELINE_PANEL_MAX_PX = 3200;
export const STRUCTURE_TIMELINE_PANEL_MAX_VH_RATIO = 0.95;

export function structureTimelinePanelStorageKey(projectId: string): string {
  return `scriptony-structure-timeline-panel-height-${projectId}`;
}

export function viewportHeightPx(): number {
  if (typeof window === "undefined") return 800;
  return window.innerHeight;
}

export function maxStructureTimelinePanelHeightPx(
  vh: number = viewportHeightPx(),
): number {
  return Math.min(
    STRUCTURE_TIMELINE_PANEL_MAX_PX,
    Math.round(vh * STRUCTURE_TIMELINE_PANEL_MAX_VH_RATIO),
  );
}

export function defaultStructureTimelinePanelHeightPx(
  projectType?: string | null,
  vh: number = viewportHeightPx(),
): number {
  if (isAudioProjectType(projectType)) {
    return Math.min(800, Math.round(vh * 0.72));
  }
  return 600;
}

export function clampStructureTimelinePanelHeightPx(
  heightPx: number,
  projectType?: string | null,
  vh: number = viewportHeightPx(),
): number {
  const max = maxStructureTimelinePanelHeightPx(vh);
  const rounded = Math.round(heightPx);
  return Math.max(STRUCTURE_TIMELINE_PANEL_MIN_PX, Math.min(max, rounded));
}

export function loadStructureTimelinePanelHeightPx(
  projectId: string,
  projectType?: string | null,
): number | null {
  if (typeof window === "undefined" || !projectId.trim()) return null;
  const raw = localStorage.getItem(structureTimelinePanelStorageKey(projectId));
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return null;
  return clampStructureTimelinePanelHeightPx(parsed, projectType);
}

export function persistStructureTimelinePanelHeightPx(
  projectId: string,
  heightPx: number,
  projectType?: string | null,
): void {
  if (typeof window === "undefined" || !projectId.trim()) return;
  const clamped = clampStructureTimelinePanelHeightPx(heightPx, projectType);
  localStorage.setItem(
    structureTimelinePanelStorageKey(projectId),
    String(clamped),
  );
}

export function resolveStructureTimelinePanelHeightPx(
  projectId: string,
  projectType?: string | null,
): number {
  return (
    loadStructureTimelinePanelHeightPx(projectId, projectType) ??
    defaultStructureTimelinePanelHeightPx(projectType)
  );
}
