import { describe, expect, it } from "vitest";
import { resolveStructureTrimOperation } from "../structure-trim-operation";

describe("resolveStructureTrimOperation", () => {
  it("uses ripple-resize for all structure kinds (CapCut act trim)", () => {
    expect(resolveStructureTrimOperation("act")).toBe("ripple-resize");
    expect(resolveStructureTrimOperation("sequence")).toBe("ripple-resize");
    expect(resolveStructureTrimOperation("scene")).toBe("ripple-resize");
    expect(resolveStructureTrimOperation("shot")).toBe("ripple-resize");
  });
});
