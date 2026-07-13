/**
 * Tests for voice design field presets.
 * Location: src/lib/mve/casting/__tests__/voice-design-field-presets.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  VOICE_DESIGN_CUSTOM_PRESET,
  VOICE_DESIGN_FIELD_PRESETS,
  resolvePresetSelectValue,
} from "../voice-design-field-presets";

describe("voice-design-field-presets", () => {
  it("defines presets for every advanced field", () => {
    const keys = Object.keys(VOICE_DESIGN_FIELD_PRESETS);
    expect(keys.length).toBeGreaterThanOrEqual(20);
    for (const key of keys) {
      const list =
        VOICE_DESIGN_FIELD_PRESETS[
          key as keyof typeof VOICE_DESIGN_FIELD_PRESETS
        ];
      expect(list.length).toBeGreaterThan(0);
      for (const preset of list) {
        expect(preset.hint.length).toBeGreaterThan(10);
      }
    }
  });

  it("resolvePresetSelectValue matches exact preset values", () => {
    const presets = VOICE_DESIGN_FIELD_PRESETS.pitch;
    expect(resolvePresetSelectValue("Mid-low pitch", presets)).toBe(
      "Mid-low pitch",
    );
    expect(resolvePresetSelectValue("custom text", presets)).toBe(
      VOICE_DESIGN_CUSTOM_PRESET,
    );
    expect(resolvePresetSelectValue("", presets)).toBe(
      VOICE_DESIGN_CUSTOM_PRESET,
    );
  });
});
