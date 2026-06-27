/**
 * Unit tests for voice tune attribute merge logic.
 * Location: src/lib/mve/tune/__tests__/merge-voice-tune-attributes.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  mergeVoiceTuneAttributes,
  mergeVoiceTuneRenderSettings,
} from "../merge-voice-tune-attributes";

describe("mergeVoiceTuneAttributes", () => {
  it("merges base attributes with description deltas", () => {
    const merged = mergeVoiceTuneAttributes(
      { genderPresentation: "female", pace: "medium" },
      "tiefer, ruhiger, energisch",
      { pitch: "low" },
    );
    expect(merged.genderPresentation).toBe("female");
    expect(merged.pitch).toBe("low");
    expect(merged.pace).toBe("slow");
    expect(merged.energy).toBe("high");
  });

  it("slider overrides win over description extraction", () => {
    const merged = mergeVoiceTuneAttributes(
      { energy: "medium" },
      "sehr ruhig",
      { energy: "high" },
    );
    expect(merged.energy).toBe("high");
  });
});

describe("mergeVoiceTuneRenderSettings", () => {
  it("applies speed override while preserving stability", () => {
    const merged = mergeVoiceTuneRenderSettings(
      { stability: 0.7, speed: 1 },
      { speed: 0.85 },
    );
    expect(merged?.stability).toBe(0.7);
    expect(merged?.speed).toBe(0.85);
  });
});
