import { describe, expect, it } from "vitest";
import {
  clampStructureTimelinePanelHeightPx,
  defaultStructureTimelinePanelHeightPx,
  maxStructureTimelinePanelHeightPx,
  structureTimelinePanelStorageKey,
} from "../structure-timeline-panel-height";

describe("structure-timeline-panel-height", () => {
  it("uses type-specific defaults", () => {
    expect(defaultStructureTimelinePanelHeightPx("film", 1000)).toBe(600);
    expect(defaultStructureTimelinePanelHeightPx("audio", 1000)).toBe(720);
    expect(defaultStructureTimelinePanelHeightPx("audio", 1200)).toBe(800);
  });

  it("clamps within min and viewport max", () => {
    const vh = 1000;
    expect(maxStructureTimelinePanelHeightPx(vh)).toBe(950);
    expect(clampStructureTimelinePanelHeightPx(100, "film", vh)).toBe(420);
    expect(clampStructureTimelinePanelHeightPx(5000, "film", vh)).toBe(950);
  });

  it("builds per-project storage key", () => {
    expect(structureTimelinePanelStorageKey("abc")).toBe(
      "scriptony-structure-timeline-panel-height-abc",
    );
  });
});
