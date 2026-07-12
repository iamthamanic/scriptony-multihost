import { describe, expect, it } from "vitest";
import {
  commitBeatReorder,
  commitBeatGroupReorder,
  computeBeatReorderInsertIndex,
  getBeatMoveInsertionSlot,
} from "../beat-move";
import type { Beat } from "../../../components/timeline-helpers";

const row: Beat[] = [
  { id: "a", pct_from: 0, pct_to: 10 },
  { id: "b", pct_from: 10, pct_to: 20 },
  { id: "c", pct_from: 20, pct_to: 30 },
];

describe("computeBeatReorderInsertIndex", () => {
  it("inserts after first beat when dragged right past midpoint", () => {
    const idx = computeBeatReorderInsertIndex(row, "a", 15, 100);
    expect(idx).toBe(1);
  });

  it("keeps first index when drag is small", () => {
    const idx = computeBeatReorderInsertIndex(row, "a", 2, 100);
    expect(idx).toBe(0);
  });
});

describe("commitBeatReorder", () => {
  it("reorders and repacks gaplessly from 0%", () => {
    const { beats } = commitBeatReorder(row, "c", 0);
    expect(beats.map((b) => b.id)).toEqual(["c", "a", "b"]);
    expect(beats[0].pct_from).toBe(0);
    expect(beats[0].pct_to).toBe(10);
    expect(beats[1].pct_from).toBe(10);
    expect(beats[2].pct_to).toBe(30);
  });
});

describe("commitBeatGroupReorder", () => {
  it("moves selected block and preserves relative order", () => {
    const wide: Beat[] = [
      { id: "a", pct_from: 0, pct_to: 10 },
      { id: "b", pct_from: 10, pct_to: 20 },
      { id: "c", pct_from: 20, pct_to: 30 },
      { id: "d", pct_from: 30, pct_to: 40 },
    ];
    const { beats } = commitBeatGroupReorder(wide, ["b", "c"], 0);
    expect(beats.map((b) => b.id)).toEqual(["b", "c", "a", "d"]);
    expect(beats[0].pct_from).toBe(0);
    expect(beats[1].pct_from).toBe(10);
    expect(beats[2].pct_from).toBe(20);
  });
});

describe("getBeatMoveInsertionSlot", () => {
  it("reports wouldChange when order changes", () => {
    const slot = getBeatMoveInsertionSlot({
      snapshot: row,
      beatId: "c",
      deltaSec: -25,
      durationSec: 100,
    });
    expect(slot?.wouldChange).toBe(true);
    expect(slot?.insertIndex).toBe(0);
  });
});
