/**
 * Persisted height for the Structure & Beats timeline panel (vertical resize).
 * Location: src/lib/structure/structure-timeline-panel-height.ts
 */

export const STRUCTURE_TIMELINE_PANEL_MIN_PX = 320;
export const STRUCTURE_TIMELINE_PANEL_MAX_PX = 1400;

export function structureTimelinePanelStorageKey(projectId: string): string {
  return `scriptony-structure-timeline-panel-height-${projectId}`;
}

export function defaultStructureTimelinePanelHeightPx(
  isAudio: boolean,
): number {
  if (typeof window === "undefined") return isAudio ? 800 : 600;
  if (isAudio) {
    return Math.min(800, Math.round(window.innerHeight * 0.72));
  }
  return 600;
}

export function clampStructureTimelinePanelHeightPx(px: number): number {
  return Math.max(
    STRUCTURE_TIMELINE_PANEL_MIN_PX,
    Math.min(STRUCTURE_TIMELINE_PANEL_MAX_PX, Math.round(px)),
  );
}

export function readStructureTimelinePanelHeightPx(
  projectId: string,
  isAudio: boolean,
): number {
  const fallback = defaultStructureTimelinePanelHeightPx(isAudio);
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(
      structureTimelinePanelStorageKey(projectId),
    );
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    const n = typeof parsed === "number" ? parsed : Number(parsed);
    if (!Number.isFinite(n)) return fallback;
    return clampStructureTimelinePanelHeightPx(n);
  } catch {
    return fallback;
  }
}

export function writeStructureTimelinePanelHeightPx(
  projectId: string,
  heightPx: number,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    structureTimelinePanelStorageKey(projectId),
    JSON.stringify(clampStructureTimelinePanelHeightPx(heightPx)),
  );
}
