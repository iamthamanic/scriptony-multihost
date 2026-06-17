/**
 * Tests for style override resolution (Step 4).
 */

import { describe, expect, it } from "vitest";
import { resolveEffectiveStyleProfileId } from "../resolve-effective-profile";

describe("resolve-effective-profile", () => {
  it("prefers shot override over project active", () => {
    expect(
      resolveEffectiveStyleProfileId({
        activeProjectProfileId: "proj-style",
        sceneOverrideId: "scene-style",
        shotAssignedProfileId: "shot-assigned",
        shotOverrideId: "shot-override",
      }),
    ).toBe("shot-override");
  });

  it("falls back to project active", () => {
    expect(
      resolveEffectiveStyleProfileId({
        activeProjectProfileId: "proj-style",
      }),
    ).toBe("proj-style");
  });
});
