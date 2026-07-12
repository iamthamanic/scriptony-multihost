/**
 * Unit tests for structure timeline panel height helpers.
 * Location: src/lib/structure/__tests__/structure-timeline-panel-height.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  clampStructureTimelinePanelHeightPx,
  defaultStructureTimelinePanelHeightPx,
  structureTimelinePanelStorageKey,
} from "../structure-timeline-panel-height";

describe("structure-timeline-panel-height", () => {
  it("builds per-project storage key", () => {
    expect(structureTimelinePanelStorageKey("proj_1")).toBe(
      "scriptony-structure-timeline-panel-height-proj_1",
    );
  });

  it("clamps panel height", () => {
    expect(clampStructureTimelinePanelHeightPx(100)).toBe(320);
    expect(clampStructureTimelinePanelHeightPx(900)).toBe(900);
    expect(clampStructureTimelinePanelHeightPx(9999)).toBe(1400);
  });

  it("defaults differ for audio vs other project types", () => {
    expect(defaultStructureTimelinePanelHeightPx(true)).toBeGreaterThanOrEqual(
      320,
    );
    expect(defaultStructureTimelinePanelHeightPx(false)).toBe(600);
  });
});
