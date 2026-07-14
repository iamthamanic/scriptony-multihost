/**
 * Tests for voice design field help constants.
 * Location: src/lib/mve/casting/__tests__/voice-design-field-help.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  clampVoiceDesignBasePrompt,
  VOICE_DESIGN_BASE_PROMPT_MAX_LENGTH,
  VOICE_DESIGN_DESCRIPTION_MAX_LENGTH,
} from "../voice-design-field-help";

describe("clampVoiceDesignBasePrompt", () => {
  it("keeps text within the base prompt limit (variation reserve)", () => {
    const long = "a".repeat(VOICE_DESIGN_DESCRIPTION_MAX_LENGTH + 50);
    const clamped = clampVoiceDesignBasePrompt(long);

    expect(clamped).toHaveLength(VOICE_DESIGN_BASE_PROMPT_MAX_LENGTH);
    expect(clamped).toBe("a".repeat(VOICE_DESIGN_BASE_PROMPT_MAX_LENGTH));
  });
});
