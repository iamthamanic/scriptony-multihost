import { describe, expect, it } from "vitest";
import { resolveTimelineDurations } from "../timeline-duration";

describe("resolveTimelineDurations", () => {
  it("keeps structure stable when only beat lane grows", () => {
    const d = resolveTimelineDurations({
      durationSec: 420,
      structureElasticSec: 420,
      beatElasticSec: 480,
    });
    expect(d.structureProjectDurationSec).toBe(420);
    expect(d.beatTimelineDurationSec).toBe(480);
    expect(d.rulerDurationSec).toBe(480);
  });

  it("uses layout hint for structure without affecting beat lane", () => {
    const d = resolveTimelineDurations({
      durationSec: 420,
      layoutDurationSec: 500,
      structureElasticSec: 420,
      beatElasticSec: 420,
    });
    expect(d.structureProjectDurationSec).toBe(500);
    expect(d.beatTimelineDurationSec).toBe(420);
    expect(d.rulerDurationSec).toBe(500);
  });

  it("ruler spans both lanes when each grows independently", () => {
    const d = resolveTimelineDurations({
      durationSec: 300,
      layoutDurationSec: 360,
      structureElasticSec: 360,
      beatElasticSec: 400,
    });
    expect(d.structureProjectDurationSec).toBe(360);
    expect(d.beatTimelineDurationSec).toBe(400);
    expect(d.rulerDurationSec).toBe(400);
  });
});
