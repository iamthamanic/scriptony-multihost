/**
 * Import StyleGuide project data into a StyleProfile spec.
 * Location: src/lib/style-profile/import-from-style-guide.ts
 */

import type { StyleGuideData } from "@/lib/api/style-guide-api";
import type { StyleProfile, StyleProfileSpec } from "@/lib/types/style-profile";
import { buildAndValidateSummary } from "./summary";
import { normalizeStyleProfileSpec } from "./normalize";

export function applyStyleGuideToSpec(
  spec: StyleProfileSpec,
  styleGuide: StyleGuideData,
): StyleProfileSpec {
  const next = normalizeStyleProfileSpec(spec);

  next.visualSpec.styleDna = {
    ...next.visualSpec.styleDna,
    status: styleGuide.styleSummary
      ? "configured"
      : next.visualSpec.styleDna.status,
    summary: styleGuide.styleSummary || next.visualSpec.styleDna.summary,
    humanRules: styleGuide.toneSummary
      ? [styleGuide.toneSummary]
      : next.visualSpec.styleDna.humanRules,
    machineParams: {
      ...next.visualSpec.styleDna.machineParams,
      keywords: styleGuide.keywords?.length ? styleGuide.keywords : undefined,
    },
  };

  const palette = [
    ...styleGuide.palettePrimary,
    ...styleGuide.paletteSecondary,
    ...styleGuide.paletteAccent,
    ...styleGuide.paletteBackground,
  ].filter(Boolean);

  if (palette.length > 0) {
    next.visualSpec.colorSystem = {
      ...next.visualSpec.colorSystem,
      status: "configured",
      machineParams: {
        ...next.visualSpec.colorSystem.machineParams,
        palette: [...new Set(palette)],
      },
    };
  }

  next.visualSpec.doAvoid = {
    ...next.visualSpec.doAvoid,
    status:
      styleGuide.mustHave?.length || styleGuide.avoid?.length
        ? "configured"
        : next.visualSpec.doAvoid.status,
    doItems: styleGuide.mustHave?.length
      ? styleGuide.mustHave
      : next.visualSpec.doAvoid.doItems,
    avoidItems: styleGuide.avoid?.length
      ? styleGuide.avoid
      : next.visualSpec.doAvoid.avoidItems,
  };

  if (styleGuide.compactPrompt) {
    next.toolSettings = {
      ...next.toolSettings,
      imageGeneration: {
        ...next.toolSettings.imageGeneration,
        promptTemplate: styleGuide.compactPrompt,
        negativePrompt:
          styleGuide.negativeKeywords?.join(", ") ||
          next.toolSettings.imageGeneration?.negativePrompt,
      },
    };
  }

  next.metadata = {
    ...next.metadata,
    importedFromStyleGuideAt: new Date().toISOString(),
    styleGuideId: styleGuide.id,
  };

  return next;
}

export function mergeStyleGuideImport(
  profile: StyleProfile,
  styleGuide: StyleGuideData,
): StyleProfile {
  const spec = applyStyleGuideToSpec(profile.spec, styleGuide);
  const configSummary = buildAndValidateSummary({
    spec,
    type: profile.type,
    status: profile.status,
    source: {
      type: "style-guide",
      referenceId: styleGuide.id,
      styleGuideId: styleGuide.id,
      importedAt: new Date().toISOString(),
    },
  });

  return {
    ...profile,
    spec,
    configSummary,
    source: {
      type: "style-guide",
      referenceId: styleGuide.id,
      styleGuideId: styleGuide.id,
      importedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };
}
