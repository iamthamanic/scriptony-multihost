import { describe, it, expect } from "vitest";
import {
  emptyFxSlots,
  fxSlotsFromMetadata,
  normalizeFxSlots,
  setFxSlotAt,
  firstEmptyFxSlotIndex,
  filterStockFxPlugins,
  getStockFxPlugin,
  isFxChainEnabled,
  mergeMetadataWithFxLane,
} from "../fx-chain";

describe("fx-chain", () => {
  it("creates 7 empty slots", () => {
    expect(emptyFxSlots()).toHaveLength(7);
    expect(emptyFxSlots().every((s) => s === null)).toBe(true);
  });

  it("reads legacy preset into slot 0 as stock reverb", () => {
    const slots = fxSlotsFromMetadata({}, "reverb_light");
    expect(slots[0]).toBe("reverb");
  });

  it("reads fxChain from metadata over legacy", () => {
    const slots = fxSlotsFromMetadata(
      { fxChain: [null, "eq", null] },
      "reverb_light",
    );
    expect(slots[0]).toBeNull();
    expect(slots[1]).toBe("eq");
  });

  it("maps legacy reverb ids to stock plugin", () => {
    expect(getStockFxPlugin("reverb_medium")?.id).toBe("reverb");
    expect(getStockFxPlugin("eq")?.name).toBe("EQ");
  });

  it("fx chain enabled defaults true", () => {
    expect(isFxChainEnabled({})).toBe(true);
    expect(isFxChainEnabled({ fxChainEnabled: false })).toBe(false);
  });

  it("merges chain enabled into metadata", () => {
    const json = mergeMetadataWithFxLane("{}", {
      slots: emptyFxSlots(),
      chainEnabled: false,
    });
    const parsed = JSON.parse(json) as { fxChainEnabled: boolean };
    expect(parsed.fxChainEnabled).toBe(false);
  });

  it("sets slot and finds first empty", () => {
    const base = emptyFxSlots();
    base[0] = "eq";
    const next = setFxSlotAt(base, 2, "delay");
    expect(next[2]).toBe("delay");
    expect(firstEmptyFxSlotIndex(base)).toBe(1);
  });

  it("normalizes arbitrary arrays", () => {
    expect(normalizeFxSlots(["a", "", null])).toEqual([
      "a",
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it("filterStockFxPlugins returns all or filtered catalog", () => {
    expect(filterStockFxPlugins("")).toHaveLength(8);
    expect(filterStockFxPlugins("rev").map((p) => p.id)).toEqual(["reverb"]);
    expect(filterStockFxPlugins("zzz")).toHaveLength(0);
  });
});
