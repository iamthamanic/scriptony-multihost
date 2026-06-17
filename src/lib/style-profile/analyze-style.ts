/**
 * Client-side style consistency analysis (Step 5 heuristic, no AI).
 * Location: src/lib/style-profile/analyze-style.ts
 */

import type { StyleProfileSpec } from "@/lib/types/style-profile";
import { STYLE_SECTION_REGISTRY } from "./section-registry";
import { getMachineStringArray } from "./section-params";

export interface StyleAnalysisScores {
  overall: number;
  line: number;
  color: number;
  shape: number;
  character: number;
  toolSettings: number;
  configuredSections: number;
  totalSections: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function sectionScore(
  state: {
    status?: string;
    summary?: string;
    machineParams?: Record<string, unknown>;
  },
  weight = 1,
): number {
  if (state.status === "configured") return weight;
  if (state.status === "draft") return weight * 0.6;
  if (state.summary?.trim()) return weight * 0.4;
  if (Object.keys(state.machineParams ?? {}).length > 0) return weight * 0.35;
  return 0;
}

export function analyzeStyleProfile(
  spec: StyleProfileSpec,
): StyleAnalysisScores {
  const vs = spec.visualSpec;
  const totalSections = STYLE_SECTION_REGISTRY.length;
  let configuredSections = 0;

  for (const section of STYLE_SECTION_REGISTRY) {
    const state = vs[section.key];
    if (
      state.status === "configured" ||
      state.summary?.trim() ||
      Object.keys(state.machineParams ?? {}).length > 0
    ) {
      configuredSections += 1;
    }
  }

  const sectionCoverage = configuredSections / totalSections;

  const palette = getMachineStringArray(vs.colorSystem, "palette");
  const color =
    palette.length >= 3
      ? 0.85
      : palette.length > 0
        ? 0.55
        : sectionScore(vs.colorSystem) * 0.5;

  const line =
    vs.lineSystem.disabled === true
      ? 0.7
      : clamp01(
          sectionScore(vs.lineSystem) +
            (vs.lineSystem.machineParams?.outerWeight != null ? 0.15 : 0),
        );

  const shape = clamp01(
    sectionScore(vs.shapeLanguage) +
      (vs.shapeLanguage.machineParams?.angularity != null ? 0.2 : 0),
  );

  const character = clamp01(
    sectionScore(vs.characterRules) +
      (vs.characterRules.machineParams?.headHeightRatio != null ? 0.15 : 0),
  );

  const img = spec.toolSettings.imageGeneration;
  const toolSettings = clamp01(
    (img?.promptTemplate?.trim() ? 0.35 : 0) +
      (img?.negativePrompt?.trim() ? 0.15 : 0) +
      (img?.steps != null ? 0.15 : 0) +
      (spec.toolSettings.comfyui?.ipAdapter?.styleReferenceStrength != null
        ? 0.2
        : 0) +
      (spec.toolSettings.blender?.renderEngine ? 0.15 : 0),
  );

  const validationRefs =
    vs.validationAssets.exampleRefs ??
    getMachineStringArray(vs.validationAssets, "assetRefs");
  const filledValidation = validationRefs.filter((r) => r?.trim()).length;
  const validationCoverage =
    filledValidation >= 4 ? 0.9 : filledValidation > 0 ? 0.55 : 0.2;

  const overall = clamp01(
    sectionCoverage * 0.4 +
      color * 0.12 +
      line * 0.08 +
      shape * 0.08 +
      character * 0.08 +
      toolSettings * 0.09 +
      validationCoverage * 0.15,
  );

  return {
    overall,
    line: clamp01(line),
    color: clamp01(color),
    shape: clamp01(shape),
    character: clamp01(character),
    toolSettings: clamp01(toolSettings),
    configuredSections,
    totalSections,
  };
}

export function formatScorePercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}
