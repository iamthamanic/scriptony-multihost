import { describe, expect, it, vi } from "vitest";
import {
  isVetStructureLayoutFrozen,
  isVetStructureMoveClip,
  isVetStructureTrimClip,
} from "../vet-structure-trim-active";

vi.mock("../vetilalorapp-feature", () => ({
  USE_HIERARCHICAL_STRUCTURE_RIPPLE: true,
}));

describe("vet-structure-trim-active", () => {
  it("detects trim and move clips", () => {
    expect(
      isVetStructureTrimClip({ kind: "act", id: "a", handle: "left" } as never),
    ).toBe(true);
    expect(isVetStructureMoveClip({ kind: "act", id: "a" })).toBe(true);
    expect(isVetStructureMoveClip({ kind: "shot", id: "s" })).toBe(false);
  });

  it("freezes layout when trim or body-move is active", () => {
    expect(isVetStructureLayoutFrozen({ trimClip: null, moveClip: null })).toBe(
      false,
    );
    expect(
      isVetStructureLayoutFrozen({
        trimClip: { kind: "scene" },
        moveClip: null,
      }),
    ).toBe(true);
    expect(
      isVetStructureLayoutFrozen({
        trimClip: null,
        moveClip: { kind: "sequence", id: "seq-1" },
      }),
    ).toBe(true);
  });
});
