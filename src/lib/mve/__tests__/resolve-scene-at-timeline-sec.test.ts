/**
 * Unit tests for in-scene reorder index math (T32 follow-up).
 * Location: src/lib/mve/__tests__/resolve-scene-at-timeline-sec.test.ts
 */

import { describe, expect, it } from "vitest";
import { reorderLineOrderIndexes } from "../resolve-scene-at-timeline-sec";

describe("reorderLineOrderIndexes", () => {
  const siblings = [
    { id: "l1", orderIndex: 0 },
    { id: "l2", orderIndex: 1 },
    { id: "l3", orderIndex: 2 },
  ];

  it("moves dragged line to the front", () => {
    const next = reorderLineOrderIndexes(siblings, "l3", 0);
    expect(next).toEqual([
      { id: "l3", orderIndex: 0 },
      { id: "l1", orderIndex: 1 },
      { id: "l2", orderIndex: 2 },
    ]);
  });

  it("moves dragged line to the end", () => {
    const next = reorderLineOrderIndexes(siblings, "l1", 2);
    expect(next).toEqual([
      { id: "l2", orderIndex: 0 },
      { id: "l3", orderIndex: 1 },
      { id: "l1", orderIndex: 2 },
    ]);
  });

  it("moves dragged line to the middle", () => {
    const next = reorderLineOrderIndexes(siblings, "l1", 1);
    expect(next).toEqual([
      { id: "l2", orderIndex: 0 },
      { id: "l1", orderIndex: 1 },
      { id: "l3", orderIndex: 2 },
    ]);
  });

  it("clamps target index beyond sibling count", () => {
    const next = reorderLineOrderIndexes(siblings, "l1", 99);
    expect(next.at(-1)).toEqual({ id: "l1", orderIndex: 2 });
  });

  it("clamps negative target index", () => {
    const next = reorderLineOrderIndexes(siblings, "l3", -5);
    expect(next[0]).toEqual({ id: "l3", orderIndex: 0 });
  });

  it("returns empty array when dragged line is not a sibling", () => {
    expect(reorderLineOrderIndexes(siblings, "missing", 0)).toEqual([]);
  });

  it("is a no-op re-assignment when already at target position", () => {
    const next = reorderLineOrderIndexes(siblings, "l1", 0);
    expect(next).toEqual(siblings);
  });
});
