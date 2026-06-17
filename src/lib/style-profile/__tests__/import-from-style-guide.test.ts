import { describe, expect, it } from "vitest";
import {
  applyStyleGuideToSpec,
  mergeStyleGuideImport,
} from "@/lib/style-profile/import-from-style-guide";
import { createEmptyStyleProfileSpec } from "@/lib/style-profile/templates";
import type { StyleGuideData } from "@/lib/api/style-guide-api";
import type { StyleProfile } from "@/lib/types/style-profile";

function sampleStyleGuide(
  overrides: Partial<StyleGuideData> = {},
): StyleGuideData {
  return {
    id: "sg-1",
    projectId: "proj-1",
    title: "Project Style",
    styleSummary: "Flat stylized animation",
    toneSummary: "Warm and playful",
    keywords: ["flat", "bold"],
    negativeKeywords: ["photoreal", "noise"],
    mustHave: ["clear silhouettes"],
    avoid: ["lens flare"],
    palettePrimary: ["#6E59A5"],
    paletteSecondary: ["#E8E4F0"],
    paletteAccent: ["#F5A623"],
    paletteBackground: ["#1A1A2E"],
    typographyNotes: "",
    compactPrompt: "stylized flat animation, bold shapes",
    exportPayload: {},
    status: "draft",
    items: [],
    ...overrides,
  };
}

function sampleProfile(): StyleProfile {
  const spec = createEmptyStyleProfileSpec();
  return {
    id: "p1",
    projectId: "proj-1",
    name: "Main",
    type: "animated_stylized",
    status: "draft",
    version: 1,
    configSummary: {},
    spec,
    sync: { status: "local" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("applyStyleGuideToSpec", () => {
  it("maps style guide fields into visual spec sections", () => {
    const spec = createEmptyStyleProfileSpec();
    const sg = sampleStyleGuide();

    const next = applyStyleGuideToSpec(spec, sg);

    expect(next.visualSpec.styleDna.summary).toBe("Flat stylized animation");
    expect(next.visualSpec.styleDna.status).toBe("configured");
    expect(next.visualSpec.doAvoid.doItems).toEqual(["clear silhouettes"]);
    expect(next.visualSpec.doAvoid.avoidItems).toEqual(["lens flare"]);
    expect(next.toolSettings.imageGeneration?.promptTemplate).toBe(
      "stylized flat animation, bold shapes",
    );
    const palette = next.visualSpec.colorSystem.machineParams?.palette as
      | string[]
      | undefined;
    expect(palette).toContain("#6E59A5");
  });

  it("leaves spec unchanged when style guide is empty", () => {
    const spec = createEmptyStyleProfileSpec();
    const sg = sampleStyleGuide({
      styleSummary: "",
      compactPrompt: "",
      mustHave: [],
      avoid: [],
      palettePrimary: [],
      paletteSecondary: [],
      paletteAccent: [],
      paletteBackground: [],
    });

    const next = applyStyleGuideToSpec(spec, sg);
    expect(next.visualSpec.styleDna.status).toBe("missing");
  });
});

describe("mergeStyleGuideImport", () => {
  it("updates profile spec, summary, and source", () => {
    const profile = sampleProfile();
    const sg = sampleStyleGuide();

    const merged = mergeStyleGuideImport(profile, sg);

    expect(merged.spec.visualSpec.styleDna.summary).toBe(
      "Flat stylized animation",
    );
    expect(merged.configSummary.styleSummary).toBe("Flat stylized animation");
    expect(merged.source?.type).toBe("style-guide");
    expect(merged.source?.styleGuideId).toBe("sg-1");
  });
});
