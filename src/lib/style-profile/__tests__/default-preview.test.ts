/**
 * Tests for default preview profile builder (no active style).
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREVIEW_TEMPLATE_ID,
  PREVIEW_PROFILE_ID,
  buildPreviewStyleProfile,
} from "../default-preview";

describe("default-preview", () => {
  it("builds animated preview with tags and palette", () => {
    const profile = buildPreviewStyleProfile("animated_stylized", "proj-1");
    expect(profile.id).toBe(PREVIEW_PROFILE_ID);
    expect(profile.type).toBe("animated_stylized");
    expect(profile.spec.visualSpec.styleDna.machineParams?.tags).toEqual(
      expect.arrayContaining(["flat cutout"]),
    );
    expect(profile.spec.visualSpec.colorSystem.machineParams?.palette).toEqual(
      expect.any(Array),
    );
  });

  it("defaults to cutout_satire template", () => {
    const profile = buildPreviewStyleProfile();
    expect(profile.source?.templateId).toBe(DEFAULT_PREVIEW_TEMPLATE_ID);
    expect(profile.source?.templateId).toBe("cutout_satire");
  });
});
