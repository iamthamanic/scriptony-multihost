/**
 * Tests for voice design field help constants.
 * Location: src/lib/mve/casting/__tests__/voice-design-field-help.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  clampVoiceDesignDescription,
  VOICE_DESIGN_DESCRIPTION_MAX_LENGTH,
} from "../voice-design-field-help";

describe("clampVoiceDesignDescription", () => {
  it("keeps text within the MVE description limit", () => {
    const long = "a".repeat(VOICE_DESIGN_DESCRIPTION_MAX_LENGTH + 50);
    const clamped = clampVoiceDesignDescription(long);

    expect(clamped).toHaveLength(VOICE_DESIGN_DESCRIPTION_MAX_LENGTH);
    expect(clamped).toBe("a".repeat(VOICE_DESIGN_DESCRIPTION_MAX_LENGTH));
  });
});
