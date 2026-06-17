/**
 * Helpers for reading/writing StyleSectionState.machineParams (T79).
 * Location: src/lib/style-profile/section-params.ts
 */

import type { StyleSectionState } from "@/lib/types/style-profile";

export function patchSection(
  state: StyleSectionState,
  partial: Partial<StyleSectionState>,
): StyleSectionState {
  const next = { ...state, ...partial };
  if (
    partial.summary !== undefined ||
    partial.doItems !== undefined ||
    partial.avoidItems !== undefined ||
    partial.machineParams !== undefined ||
    partial.humanRules !== undefined
  ) {
    next.status = inferSectionStatus(next);
  }
  return next;
}

export function patchMachineParams(
  state: StyleSectionState,
  patch: Record<string, unknown>,
): StyleSectionState {
  return patchSection(state, {
    machineParams: { ...(state.machineParams ?? {}), ...patch },
  });
}

function inferSectionStatus(
  state: StyleSectionState,
): StyleSectionState["status"] {
  if (
    state.summary?.trim() ||
    state.doItems?.length ||
    state.avoidItems?.length
  ) {
    return "configured";
  }
  if (Object.keys(state.machineParams ?? {}).length > 0) {
    return "draft";
  }
  return state.status === "missing" ? "missing" : "draft";
}

export function getMachineNumber(
  state: StyleSectionState,
  key: string,
  fallback: number,
): number {
  const raw = state.machineParams?.[key];
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function getMachineString(
  state: StyleSectionState,
  key: string,
  fallback = "",
): string {
  const raw = state.machineParams?.[key];
  return typeof raw === "string" ? raw : fallback;
}

export function getMachineBool(
  state: StyleSectionState,
  key: string,
  fallback: boolean,
): boolean {
  const raw = state.machineParams?.[key];
  return typeof raw === "boolean" ? raw : fallback;
}

export function getMachineStringArray(
  state: StyleSectionState,
  key: string,
): string[] {
  const raw = state.machineParams?.[key];
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
}

/** Reads numeric slider value; booleans map to 0/1 (legacy templates). */
export function getMachineScalar(
  state: StyleSectionState,
  key: string,
  fallback: number,
): number {
  const raw = state.machineParams?.[key];
  if (typeof raw === "boolean") return raw ? 1 : 0;
  return getMachineNumber(state, key, fallback);
}

/** focalLengths with legacy `lenses` alias (mm suffix stripped). */
export function getFocalLengthTags(state: StyleSectionState): string[] {
  const direct = getMachineStringArray(state, "focalLengths");
  if (direct.length > 0) return direct;
  return getMachineStringArray(state, "lenses").map((v) =>
    v.replace(/mm$/i, "").trim(),
  );
}
