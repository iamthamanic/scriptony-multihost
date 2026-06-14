import { describe, expect, it } from "vitest";
import {
  commitBeatTrimPositions,
  gaplessRippleFromRight,
  sortBeatsByStart,
} from "../beat-trim-commit";
import type { Beat } from "../../../components/timeline-helpers";

const sample: Beat[] = [
  { id: "a", pct_from: 0, pct_to: 10, label: "A" },
  { id: "b", pct_from: 10, pct_to: 12, label: "B" },
  { id: "c", pct_from: 12, pct_to: 15, label: "C" },
  { id: "d", pct_from: 15, pct_to: 100, label: "D" },
];

describe("gaplessRippleFromRight", () => {
  it("packs all following beats without gaps", () => {
    const sorted = sortBeatsByStart(sample);
    const rippled = gaplessRippleFromRight(sorted, 0, 18);
    expect(rippled).toHaveLength(3);
    expect(rippled[0]).toMatchObject({ id: "b", pct_from: 18, pct_to: 20 });
    expect(rippled[1]).toMatchObject({ id: "c", pct_from: 20, pct_to: 23 });
    expect(rippled[2].pct_from).toBe(23);
  });
});

describe("commitBeatTrimPositions", () => {
  it("extends timeline scale when ripple exceeds 100%", () => {
    const snapshot: Beat[] = [
      { id: "1", pct_from: 0, pct_to: 10 },
      { id: "2", pct_from: 10, pct_to: 12 },
      { id: "3", pct_from: 12, pct_to: 15 },
      { id: "4", pct_from: 15, pct_to: 100 },
    ];

    const { beats, durationScale } = commitBeatTrimPositions({
      snapshot,
      beatId: "1",
      handle: "right",
      trimmedBeat: { pct_from: 0, pct_to: 18 },
    });

    expect(durationScale).toBeGreaterThan(1);
    expect(beats[beats.length - 1].pct_to).toBeLessThanOrEqual(100.01);
    for (let i = 1; i < beats.length; i++) {
      expect(beats[i].pct_from).toBeCloseTo(beats[i - 1].pct_to, 4);
    }
    expect(beats[0].pct_to).toBeCloseTo(18 / durationScale, 4);
  });

  it("keeps gapless row for moderate right trim within 100%", () => {
    const compact: Beat[] = [
      { id: "a", pct_from: 0, pct_to: 10 },
      { id: "b", pct_from: 10, pct_to: 20 },
      { id: "c", pct_from: 20, pct_to: 30 },
    ];

    const { beats, durationScale } = commitBeatTrimPositions({
      snapshot: compact,
      beatId: "a",
      handle: "right",
      trimmedBeat: { pct_from: 0, pct_to: 14 },
    });

    expect(durationScale).toBe(1);
    expect(beats[0].pct_to).toBe(14);
    expect(beats[1].pct_from).toBe(14);
    expect(beats[1].pct_to).toBe(24);
    expect(beats[2].pct_from).toBe(24);
    expect(beats[2].pct_to).toBe(34);
  });
});
