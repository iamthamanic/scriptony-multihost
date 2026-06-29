/**
 * Unit tests for scene-duration-policy.
 */

import { describe, it, expect } from "vitest";
import {
  isContentDrivenSceneDuration,
  sceneDurationModeForProjectType,
} from "../scene-duration-policy";

describe("sceneDurationModeForProjectType", () => {
  it("audio projects are contentDriven", () => {
    expect(sceneDurationModeForProjectType("audio")).toBe("contentDriven");
  });

  it("film projects are structureDriven", () => {
    expect(sceneDurationModeForProjectType("film")).toBe("structureDriven");
  });
});

describe("isContentDrivenSceneDuration", () => {
  it("returns true only for audio", () => {
    expect(isContentDrivenSceneDuration("audio")).toBe(true);
    expect(isContentDrivenSceneDuration("film")).toBe(false);
  });
});
