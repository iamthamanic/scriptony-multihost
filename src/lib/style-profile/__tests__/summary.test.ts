import { describe, expect, it } from "vitest";
import {
  buildAndValidateSummary,
  buildStyleProfileSummary,
  StyleProfileSummaryTooLargeError,
  STYLE_PROFILE_SUMMARY_MAX_BYTES,
} from "@/lib/style-profile/summary";
import { createEmptyStyleProfileSpec } from "@/lib/style-profile/templates";

describe("buildStyleProfileSummary", () => {
  it("produces compact summary under byte limit", () => {
    const spec = createEmptyStyleProfileSpec();
    spec.visualSpec.styleDna.summary = "Stylized flat animation";
    spec.toolSettings.imageGeneration = {
      promptTemplate: "cinematic wide shot",
      negativePrompt: "blur, noise",
    };

    const summary = buildAndValidateSummary({
      spec,
      type: "animated_stylized",
    });
    const bytes = JSON.stringify(summary).length;

    expect(summary.styleSummary).toBe("Stylized flat animation");
    expect(summary.compactPrompt).toBe("cinematic wide shot");
    expect(bytes).toBeLessThan(STYLE_PROFILE_SUMMARY_MAX_BYTES);
  });

  it("throws when summary exceeds limit", () => {
    const spec = createEmptyStyleProfileSpec();
    spec.visualSpec.styleDna.summary = "x".repeat(
      STYLE_PROFILE_SUMMARY_MAX_BYTES,
    );

    expect(() => buildAndValidateSummary({ spec, type: "custom" })).toThrow(
      StyleProfileSummaryTooLargeError,
    );
  });

  it("strips undefined keys", () => {
    const summary = buildStyleProfileSummary({
      spec: createEmptyStyleProfileSpec(),
    });
    expect(Object.values(summary).every((v) => v !== undefined)).toBe(true);
  });
});
