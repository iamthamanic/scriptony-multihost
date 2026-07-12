import { describe, expect, it } from "vitest";
import {
  dedupeActsById,
  resolveFilmActGlobalSpans,
  sortActsByOrder,
  withFilmActsPctResolved,
} from "./timeline-act-layout";

describe("resolveFilmActGlobalSpans", () => {
  it("packs implicit gaps between act pct spans", () => {
    const acts = [
      { id: "a1", orderIndex: 1, metadata: { pct_from: 0, pct_to: 20 } },
      { id: "a2", orderIndex: 2, metadata: { pct_from: 40, pct_to: 60 } },
    ];
    const spans = resolveFilmActGlobalSpans(acts, 100);
    const s1 = spans.get("a1")!;
    const s2 = spans.get("a2")!;
    expect(s1.startSec).toBe(0);
    expect(s1.endSec).toBe(20);
    expect(s2.startSec).toBeCloseTo(20, 2);
    expect(s2.endSec).toBe(40);
  });

  it("de-overlaps acts that share the same pct range", () => {
    const acts = [
      { id: "a1", orderIndex: 1, metadata: { pct_from: 0, pct_to: 10 } },
      { id: "a2", orderIndex: 2, metadata: { pct_from: 0, pct_to: 15 } },
    ];
    const spans = resolveFilmActGlobalSpans(acts, 100);
    const s1 = spans.get("a1")!;
    const s2 = spans.get("a2")!;
    expect(s1.startSec).toBe(0);
    expect(s1.endSec).toBeCloseTo(10, 2);
    expect(s2.startSec).toBeGreaterThanOrEqual(s1.endSec - 0.01);
    expect(s2.endSec).toBeGreaterThan(s2.startSec);
  });

  it("keeps non-overlapping acts unchanged", () => {
    const acts = [
      { id: "a1", orderIndex: 1, metadata: { pct_from: 0, pct_to: 40 } },
      { id: "a2", orderIndex: 2, metadata: { pct_from: 40, pct_to: 100 } },
    ];
    const spans = resolveFilmActGlobalSpans(acts, 100);
    expect(spans.get("a1")?.startSec).toBe(0);
    expect(spans.get("a1")?.endSec).toBe(40);
    expect(spans.get("a2")?.startSec).toBe(40);
    expect(spans.get("a2")?.endSec).toBe(100);
  });

  it("dedupeActsById keeps one row per id (lowest orderIndex)", () => {
    const acts = [
      { id: "dup", orderIndex: 2, metadata: { pct_from: 50, pct_to: 100 } },
      { id: "dup", orderIndex: 1, metadata: { pct_from: 0, pct_to: 50 } },
      { id: "solo", orderIndex: 3, metadata: { pct_from: 0, pct_to: 100 } },
    ];
    const out = dedupeActsById(acts);
    expect(out.map((a) => a.id)).toEqual(["dup", "solo"]);
    expect(out[0].orderIndex).toBe(1);
  });

  it("withFilmActsPctResolved dedupes before applying pct", () => {
    const data = withFilmActsPctResolved(
      {
        acts: [
          { id: "a", orderIndex: 1, metadata: { pct_from: 0, pct_to: 10 } },
          { id: "a", orderIndex: 1, metadata: { pct_from: 0, pct_to: 10 } },
          { id: "b", orderIndex: 2, metadata: { pct_from: 0, pct_to: 10 } },
        ],
      },
      100,
    );
    expect(data.acts).toHaveLength(2);
  });

  it("sorts by orderIndex not array order", () => {
    const acts = [
      { id: "second", orderIndex: 2, metadata: { pct_from: 50, pct_to: 100 } },
      { id: "first", orderIndex: 1, metadata: { pct_from: 0, pct_to: 50 } },
    ];
    const sorted = sortActsByOrder(acts);
    expect(sorted[0].id).toBe("first");
    const spans = resolveFilmActGlobalSpans(acts, 100);
    expect(spans.get("first")?.startSec).toBe(0);
    expect(spans.get("second")?.startSec).toBe(50);
  });
});
