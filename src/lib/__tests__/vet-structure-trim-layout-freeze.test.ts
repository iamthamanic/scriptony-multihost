import { describe, expect, it } from "vitest";
import {
  clearFrozenStructureRowLayouts,
  freezeStructureRowLayouts,
  pickFrozenStructureBlocks,
} from "../vet-structure-trim-layout-freeze";

describe("vet-structure-trim-layout-freeze", () => {
  it("pickFrozen_returns_live_when_inactive", () => {
    const frozen = { current: null };
    const live = [{ id: "a", x: 10 }];
    expect(pickFrozenStructureBlocks(frozen, "acts", live, false)).toBe(live);
  });

  it("pickFrozen_returns_snapshot_when_active", () => {
    const frozen = { current: null };
    freezeStructureRowLayouts(frozen, {
      acts: [{ id: "a", x: 1 }],
      sequences: [],
      scenes: [],
      shots: [],
    });
    const live = [{ id: "a", x: 99 }];
    expect(pickFrozenStructureBlocks(frozen, "acts", live, true)).toEqual([
      { id: "a", x: 1 },
    ]);
    clearFrozenStructureRowLayouts(frozen);
    expect(frozen.current).toBeNull();
  });

  it("pickFrozen_uses_ref_snapshot_before_react_state_flushes", () => {
    const frozen = { current: null };
    freezeStructureRowLayouts(frozen, {
      acts: [{ id: "act-2", x: 5 }],
      sequences: [],
      scenes: [],
      shots: [],
    });
    const live = [{ id: "act-2", x: 500 }];
    expect(pickFrozenStructureBlocks(frozen, "acts", live, false)).toEqual([
      { id: "act-2", x: 5 },
    ]);
    clearFrozenStructureRowLayouts(frozen);
  });

  it("pickFrozen_prefers_live_when_new_structure_ids_after_add", () => {
    const frozen = { current: null };
    freezeStructureRowLayouts(frozen, {
      acts: [],
      sequences: [{ id: "seq-1", x: 10 }],
      scenes: [{ id: "scene-1", x: 20 }],
      shots: [],
    });
    const live = [
      { id: "scene-1", x: 20 },
      { id: "scene-2", x: 40 },
    ];
    expect(pickFrozenStructureBlocks(frozen, "scenes", live, false)).toBe(live);
    clearFrozenStructureRowLayouts(frozen);
  });
});
