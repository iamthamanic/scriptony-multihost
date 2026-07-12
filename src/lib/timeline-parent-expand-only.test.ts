import { describe, expect, it } from "vitest";
import {
  contentFitsShell,
  expandOnlyActPctToFitGlobalNeed,
  expandOnlyActSequencePctToFitGlobalNeed,
  expandOnlyStructurePctToFitGlobalNeed,
  expandShellToContainNeed,
  patchExpandsParentShell,
} from "./timeline-parent-expand-only";

describe("expandShellToContainNeed", () => {
  it("returns null when need fits inside shell", () => {
    expect(
      expandShellToContainNeed(
        { startSec: 20, endSec: 40 },
        { startSec: 10, endSec: 50 },
      ),
    ).toBeNull();
  });

  it("widens shell only on overflowing edges", () => {
    expect(
      expandShellToContainNeed(
        { startSec: 5, endSec: 55 },
        { startSec: 10, endSec: 50 },
      ),
    ).toEqual({ startSec: 5, endSec: 55 });
  });

  it("does not tighten when need is smaller than shell", () => {
    expect(
      expandShellToContainNeed(
        { startSec: 30, endSec: 35 },
        { startSec: 10, endSec: 50 },
      ),
    ).toBeNull();
  });
});

describe("expandOnlyStructurePctToFitGlobalNeed", () => {
  const blocks = {
    actBlock: { id: "a1", startSec: 0, endSec: 100 },
    sequenceBlock: { id: "s1", startSec: 10, endSec: 60 },
    sceneBlock: { id: "sc1", startSec: 20, endSec: 40 },
    totalDur: 100,
  };

  it("returns empty when child shrinks inside parents", () => {
    const r = expandOnlyStructurePctToFitGlobalNeed({
      needStartSec: 25,
      needEndSec: 35,
      ...blocks,
    });
    expect(r).toEqual({});
  });

  it("expands scene only when need exceeds scene but still fits sequence/act", () => {
    const r = expandOnlyStructurePctToFitGlobalNeed({
      needStartSec: 15,
      needEndSec: 55,
      ...blocks,
    });
    expect(r.scene).toBeDefined();
    expect(r.sequence).toBeUndefined();
    expect(r.act).toBeUndefined();
  });

  it("expands act when need exceeds act shell", () => {
    const r = expandOnlyStructurePctToFitGlobalNeed({
      needStartSec: -5,
      needEndSec: 105,
      ...blocks,
    });
    expect(r.act).toBeDefined();
    expect(r.act?.pct_from).toBe(0);
    expect(r.act?.pct_to).toBe(100);
  });

  it("does not shrink act when need is only smaller than scene shell", () => {
    const r = expandOnlyStructurePctToFitGlobalNeed({
      needStartSec: 22,
      needEndSec: 38,
      ...blocks,
    });
    expect(r.act).toBeUndefined();
    expect(r.sequence).toBeUndefined();
    expect(r.scene).toBeUndefined();
  });
});

describe("expandOnlyActSequencePctToFitGlobalNeed", () => {
  it("returns empty when sequence need fits", () => {
    expect(
      expandOnlyActSequencePctToFitGlobalNeed({
        needStartSec: 20,
        needEndSec: 50,
        actBlock: { id: "a", startSec: 0, endSec: 100 },
        sequenceBlock: { id: "s", startSec: 10, endSec: 60 },
        totalDur: 100,
      }),
    ).toEqual({});
  });
});

describe("expandOnlyActPctToFitGlobalNeed", () => {
  it("expands act pct when need exceeds act shell", () => {
    const r = expandOnlyActPctToFitGlobalNeed({
      needStartSec: 0,
      needEndSec: 120,
      actBlock: { id: "a", startSec: 10, endSec: 80 },
      totalDur: 100,
    });
    expect(r.act?.pct_from).toBe(0);
    expect(r.act?.pct_to).toBe(100);
  });

  it("does not patch when need fits act", () => {
    expect(
      expandOnlyActPctToFitGlobalNeed({
        needStartSec: 20,
        needEndSec: 50,
        actBlock: { id: "a", startSec: 10, endSec: 80 },
        totalDur: 100,
      }),
    ).toEqual({});
  });
});

describe("patchExpandsParentShell", () => {
  it("rejects shrink-only patches", () => {
    expect(
      patchExpandsParentShell(
        { startSec: 0, endSec: 100 },
        { pct_from: 10, pct_to: 20 },
        100,
      ),
    ).toBe(false);
  });

  it("accepts expand patches", () => {
    expect(
      patchExpandsParentShell(
        { startSec: 0, endSec: 50 },
        { pct_from: 0, pct_to: 60 },
        100,
      ),
    ).toBe(true);
  });
});

describe("contentFitsShell", () => {
  it("treats need inside shell as fit", () => {
    expect(
      contentFitsShell(
        { startSec: 25, endSec: 35 },
        { startSec: 10, endSec: 50 },
      ),
    ).toBe(true);
  });
});
