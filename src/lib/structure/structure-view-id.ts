/**
 * Structure section view IDs (tabs in StructureBeatsSection).
 * UI labels stay "Dropdown" / "Timeline" / "Native"; these are technical values only.
 */

export type StructureViewId = "dropdownview" | "timelineview" | "nativeview";

export const STRUCTURE_VIEW_IDS = {
  dropdownview: "dropdownview",
  timelineview: "timelineview",
  nativeview: "nativeview",
} as const satisfies Record<StructureViewId, StructureViewId>;

export const DEFAULT_STRUCTURE_VIEW: StructureViewId =
  STRUCTURE_VIEW_IDS.dropdownview;

/** Map legacy tab values from older builds (if persisted). */
const LEGACY_STRUCTURE_VIEW: Record<string, StructureViewId> = {
  dropdown: STRUCTURE_VIEW_IDS.dropdownview,
  timeline: STRUCTURE_VIEW_IDS.timelineview,
  native: STRUCTURE_VIEW_IDS.nativeview,
};

export function normalizeStructureViewId(
  value: string | null | undefined,
): StructureViewId | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed in STRUCTURE_VIEW_IDS) {
    return trimmed as StructureViewId;
  }
  return LEGACY_STRUCTURE_VIEW[trimmed] ?? null;
}

export function isStructureViewId(value: string): value is StructureViewId {
  return normalizeStructureViewId(value) === value;
}

export function structureViewStorageKey(projectId: string): string {
  return `scriptony-structure-view-${projectId}`;
}

/** Survives ProjectDetail remounts (e.g. silent duration extend must not reset tabs). */
export function readPersistedStructureView(projectId: string): StructureViewId {
  if (typeof window === "undefined") return DEFAULT_STRUCTURE_VIEW;
  try {
    return (
      normalizeStructureViewId(
        sessionStorage.getItem(structureViewStorageKey(projectId)),
      ) ?? DEFAULT_STRUCTURE_VIEW
    );
  } catch {
    return DEFAULT_STRUCTURE_VIEW;
  }
}

export function persistStructureView(
  projectId: string,
  view: StructureViewId,
): void {
  try {
    sessionStorage.setItem(structureViewStorageKey(projectId), view);
  } catch {
    // sessionStorage unavailable — ignore
  }
}
