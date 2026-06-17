/**
 * Tests for style section machineParams helpers (T79).
 */

import { describe, expect, it } from "vitest";
import {
  getFocalLengthTags,
  getMachineNumber,
  getMachineScalar,
  getMachineStringArray,
  patchMachineParams,
} from "../section-params";
import type { StyleSectionState } from "@/lib/types/style-profile";

const base: StyleSectionState = { status: "draft" };

describe("section-params", () => {
  it("patchMachineParams merges keys", () => {
    const next = patchMachineParams(
      { ...base, machineParams: { angularity: 0.5 } },
      { chunkiness: 0.8 },
    );
    expect(next.machineParams).toEqual({ angularity: 0.5, chunkiness: 0.8 });
    expect(next.status).toBe("draft");
  });

  it("getMachineNumber reads numeric values", () => {
    expect(
      getMachineNumber(
        { ...base, machineParams: { saturation: 0.72 } },
        "saturation",
        0,
      ),
    ).toBe(0.72);
    expect(getMachineNumber(base, "saturation", 0.5)).toBe(0.5);
  });

  it("getMachineStringArray filters invalid entries", () => {
    expect(
      getMachineStringArray(
        { ...base, machineParams: { tags: ["a", "", 1, "b"] } },
        "tags",
      ),
    ).toEqual(["a", "b"]);
  });

  it("getMachineScalar maps booleans to 0/1", () => {
    expect(
      getMachineScalar(
        { ...base, machineParams: { rimLight: true } },
        "rimLight",
        0,
      ),
    ).toBe(1);
    expect(
      getMachineScalar(
        { ...base, machineParams: { rimLight: false } },
        "rimLight",
        0.5,
      ),
    ).toBe(0);
  });

  it("getFocalLengthTags falls back to lenses alias", () => {
    expect(
      getFocalLengthTags({
        ...base,
        machineParams: { lenses: ["18mm", "35mm"] },
      }),
    ).toEqual(["18", "35"]);
    expect(
      getFocalLengthTags({
        ...base,
        machineParams: { focalLengths: ["50", "85"] },
      }),
    ).toEqual(["50", "85"]);
  });
});
