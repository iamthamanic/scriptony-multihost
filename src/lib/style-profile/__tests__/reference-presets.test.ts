/**
 * Tests for reference preset spec builders (T83).
 */

import { describe, expect, it } from "vitest";
import { buildSpecFromTemplate, templateIdToType } from "../reference-presets";

describe("reference-presets", () => {
  it("cutout_satire overrides dna tags", () => {
    const spec = buildSpecFromTemplate("cutout_satire");
    expect(spec.visualSpec.styleDna.machineParams?.tags).toEqual(
      expect.arrayContaining(["flat cutout", "satire"]),
    );
    expect(templateIdToType("cutout_satire")).toBe("animated_stylized");
  });

  it("wes_anderson uses cinematic type and high symmetry", () => {
    const spec = buildSpecFromTemplate("wes_anderson");
    expect(templateIdToType("wes_anderson")).toBe("cinematic_photoreal");
    expect(spec.visualSpec.cameraComposition.machineParams?.symmetry).toBe(
      0.95,
    );
  });
});
