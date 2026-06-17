/**
 * Build compact cloud-safe summary from full StyleProfileSpec.
 * Location: src/lib/style-profile/summary.ts
 */

import type {
  StyleProfile,
  StyleProfileSpec,
  StyleProfileSummary,
  StyleProfileType,
  StyleProfileStatus,
} from "@/lib/types/style-profile";

export const STYLE_PROFILE_SUMMARY_MAX_BYTES = 10_000;

export class StyleProfileSummaryTooLargeError extends Error {
  readonly byteLength: number;

  constructor(byteLength: number) {
    super(
      `Style profile summary exceeds ${STYLE_PROFILE_SUMMARY_MAX_BYTES} bytes (${byteLength})`,
    );
    this.name = "StyleProfileSummaryTooLargeError";
    this.byteLength = byteLength;
  }
}

export function buildStyleProfileSummary(input: {
  spec: StyleProfileSpec;
  name?: string;
  type?: StyleProfileType;
  status?: StyleProfileStatus;
  source?: StyleProfile["source"];
}): StyleProfileSummary {
  const { spec, type, status, source } = input;
  const dna = spec.visualSpec.styleDna;
  const color = spec.visualSpec.colorSystem;
  const doAvoid = spec.visualSpec.doAvoid;
  const img = spec.toolSettings.imageGeneration;

  const keywords =
    (dna.machineParams?.tags as string[] | undefined) ??
    (dna.humanRules?.length ? dna.humanRules : undefined);

  const palette =
    (color.machineParams?.palette as string[] | undefined) ?? undefined;

  const summary: StyleProfileSummary = {
    styleSummary: dna.summary,
    toneSummary: dna.humanRules?.join("; "),
    keywords,
    negativeKeywords: img?.negativePrompt
      ? img.negativePrompt
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : doAvoid.avoidItems,
    mustHave: doAvoid.doItems,
    avoid: doAvoid.avoidItems,
    palettePrimary: palette,
    compactPrompt: img?.promptTemplate,
    type,
    status,
    source,
  };

  // Strip undefined keys for smaller JSON
  for (const key of Object.keys(summary)) {
    const k = key as keyof StyleProfileSummary;
    if (summary[k] === undefined) delete summary[k];
  }

  return summary;
}

export function assertSummaryWithinLimit(summary: StyleProfileSummary): void {
  const json = JSON.stringify(summary);
  if (json.length > STYLE_PROFILE_SUMMARY_MAX_BYTES) {
    throw new StyleProfileSummaryTooLargeError(json.length);
  }
}

export function buildAndValidateSummary(
  input: Parameters<typeof buildStyleProfileSummary>[0],
): StyleProfileSummary {
  const summary = buildStyleProfileSummary(input);
  assertSummaryWithinLimit(summary);
  return summary;
}

/** Legacy cloud config row → summary fields. */
export function legacyConfigToSummary(
  config: Record<string, unknown>,
): StyleProfileSummary {
  return {
    styleSummary:
      typeof config.styleSummary === "string" ? config.styleSummary : undefined,
    toneSummary:
      typeof config.toneSummary === "string" ? config.toneSummary : undefined,
    keywords: Array.isArray(config.keywords)
      ? (config.keywords as string[])
      : undefined,
    negativeKeywords: Array.isArray(config.negativeKeywords)
      ? (config.negativeKeywords as string[])
      : undefined,
    mustHave: Array.isArray(config.mustHave)
      ? (config.mustHave as string[])
      : undefined,
    avoid: Array.isArray(config.avoid) ? (config.avoid as string[]) : undefined,
    palettePrimary: Array.isArray(config.palettePrimary)
      ? (config.palettePrimary as string[])
      : undefined,
    paletteSecondary: Array.isArray(config.paletteSecondary)
      ? (config.paletteSecondary as string[])
      : undefined,
    paletteAccent: Array.isArray(config.paletteAccent)
      ? (config.paletteAccent as string[])
      : undefined,
    paletteBackground: Array.isArray(config.paletteBackground)
      ? (config.paletteBackground as string[])
      : undefined,
    typographyNotes:
      typeof config.typographyNotes === "string"
        ? config.typographyNotes
        : undefined,
    compactPrompt:
      typeof config.compactPrompt === "string"
        ? config.compactPrompt
        : undefined,
    source:
      config.source && typeof config.source === "object"
        ? (config.source as StyleProfileSummary["source"])
        : undefined,
  };
}
