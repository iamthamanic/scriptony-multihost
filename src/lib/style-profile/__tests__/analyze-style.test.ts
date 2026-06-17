/**
 * Tests for style analysis heuristic (Step 5).
 */

import { describe, expect, it } from "vitest";
import { analyzeStyleProfile } from "../analyze-style";
import { buildSpecFromTemplate } from "../reference-presets";

describe("analyze-style", () => {
  it("returns higher overall for filled preset", () => {
    const spec = buildSpecFromTemplate("cutout_satire");
    const scores = analyzeStyleProfile(spec);
    expect(scores.overall).toBeGreaterThan(0.4);
    expect(scores.configuredSections).toBeGreaterThan(5);
  });
});
