/**
 * Style profile consistency heuristic (Step 5 — shared server/client logic).
 * Location: functions/_shared/style-analyze.ts
 */

const VISUAL_SECTION_KEYS = [
  "styleDna",
  "shapeLanguage",
  "lineSystem",
  "colorSystem",
  "shadingLighting",
  "characterRules",
  "creatureRules",
  "propRules",
  "vehicleRules",
  "environmentRules",
  "materialRules",
  "fxRules",
  "cameraComposition",
  "poseActing",
  "doAvoid",
  "recognitionMarkers",
  "validationAssets",
] as const;

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

type SectionState = {
  status?: string;
  summary?: string;
  machineParams?: Record<string, unknown>;
  disabled?: boolean;
  exampleRefs?: string[];
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function getMachineStringArray(state: SectionState, key: string): string[] {
  const raw = state.machineParams?.[key];
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
}

function sectionScore(state: SectionState | undefined, weight = 1): number {
  if (!state) return 0;
  if (state.status === "configured") return weight;
  if (state.status === "draft") return weight * 0.6;
  if (state.summary?.trim()) return weight * 0.4;
  if (Object.keys(state.machineParams ?? {}).length > 0) return weight * 0.35;
  return 0;
}

export function analyzeStyleProfileSpec(
  spec: Record<string, unknown>,
): StyleAnalysisScores {
  const visualSpec = (spec.visualSpec ?? {}) as Record<string, SectionState>;
  const toolSettings = (spec.toolSettings ?? {}) as Record<string, unknown>;
  const totalSections = VISUAL_SECTION_KEYS.length;
  let configuredSections = 0;

  for (const key of VISUAL_SECTION_KEYS) {
    const state = visualSpec[key];
    if (
      state?.status === "configured" ||
      state?.summary?.trim() ||
      Object.keys(state?.machineParams ?? {}).length > 0
    ) {
      configuredSections += 1;
    }
  }

  const sectionCoverage = configuredSections / totalSections;
  const colorSystem = visualSpec.colorSystem;
  const palette = getMachineStringArray(colorSystem ?? {}, "palette");
  const color =
    palette.length >= 3
      ? 0.85
      : palette.length > 0
        ? 0.55
        : sectionScore(colorSystem) * 0.5;

  const lineSystem = visualSpec.lineSystem;
  const line =
    lineSystem?.disabled === true
      ? 0.7
      : clamp01(
          sectionScore(lineSystem) +
            (lineSystem?.machineParams?.outerWeight != null ? 0.15 : 0),
        );

  const shape = clamp01(
    sectionScore(visualSpec.shapeLanguage) +
      (visualSpec.shapeLanguage?.machineParams?.angularity != null ? 0.2 : 0),
  );

  const character = clamp01(
    sectionScore(visualSpec.characterRules) +
      (visualSpec.characterRules?.machineParams?.headHeightRatio != null
        ? 0.15
        : 0),
  );

  const img = toolSettings.imageGeneration as
    | Record<string, unknown>
    | undefined;
  const comfy = toolSettings.comfyui as Record<string, unknown> | undefined;
  const blender = toolSettings.blender as Record<string, unknown> | undefined;
  const ipAdapter = comfy?.ipAdapter as Record<string, unknown> | undefined;

  const toolScore = clamp01(
    (typeof img?.promptTemplate === "string" && img.promptTemplate.trim()
      ? 0.35
      : 0) +
      (typeof img?.negativePrompt === "string" && img.negativePrompt.trim()
        ? 0.15
        : 0) +
      (img?.steps != null ? 0.15 : 0) +
      (ipAdapter?.styleReferenceStrength != null ? 0.2 : 0) +
      (typeof blender?.renderEngine === "string" ? 0.15 : 0),
  );

  const validationState = visualSpec.validationAssets;
  const validationRefs = Array.isArray(validationState?.exampleRefs)
    ? validationState.exampleRefs.filter(
        (v): v is string => typeof v === "string" && v.trim().length > 0,
      )
    : [];
  const assetRefs = Array.isArray(
    validationState?.machineParams?.assetRefs as unknown,
  )
    ? (validationState.machineParams.assetRefs as unknown[]).filter(
        (v): v is string => typeof v === "string" && v.trim().length > 0,
      )
    : [];
  const filledValidation = Math.max(validationRefs.length, assetRefs.length);
  const validationCoverage =
    filledValidation >= 4 ? 0.9 : filledValidation > 0 ? 0.55 : 0.2;

  const overall = clamp01(
    sectionCoverage * 0.4 +
      color * 0.12 +
      line * 0.08 +
      shape * 0.08 +
      character * 0.08 +
      toolScore * 0.09 +
      validationCoverage * 0.15,
  );

  return {
    overall,
    line: clamp01(line),
    color: clamp01(color),
    shape: clamp01(shape),
    character: clamp01(character),
    toolSettings: clamp01(toolScore),
    configuredSections,
    totalSections,
  };
}
