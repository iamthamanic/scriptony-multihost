/**
 * Tests for tool settings helpers (T81).
 */

import { describe, expect, it } from "vitest";
import {
  promptToTokens,
  tokensToPrompt,
  patchImageGeneration,
} from "../tool-settings-params";
import { createEmptyStyleProfileSpec } from "../templates";

describe("tool-settings-params", () => {
  it("splits and joins prompt tokens", () => {
    expect(promptToTokens("flat cutout, paper layers; satire")).toEqual([
      "flat cutout",
      "paper layers",
      "satire",
    ]);
    expect(tokensToPrompt(["a", "b"])).toBe("a, b");
  });

  it("patchImageGeneration merges fields", () => {
    const spec = createEmptyStyleProfileSpec();
    const next = patchImageGeneration(spec, { steps: 30, cfg: 7.5 });
    expect(next.toolSettings.imageGeneration?.steps).toBe(30);
    expect(next.toolSettings.imageGeneration?.cfg).toBe(7.5);
  });
});
