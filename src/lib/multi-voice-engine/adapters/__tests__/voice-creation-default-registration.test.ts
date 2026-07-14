/**
 * Tests for default voice creation registry registration.
 * Location: src/lib/multi-voice-engine/adapters/__tests__/voice-creation-default-registration.test.ts
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  getDefaultVoiceCreationRegistry,
  resetDefaultVoiceCreationRegistryForTests,
} from "../voice-creation-registry";
import { registerDefaultVoiceCreationAdapters } from "../index";

describe("registerDefaultVoiceCreationAdapters", () => {
  beforeEach(() => {
    resetDefaultVoiceCreationRegistryForTests();
  });

  it("registers qwen-voice-design provider", () => {
    registerDefaultVoiceCreationAdapters();
    const adapter =
      getDefaultVoiceCreationRegistry().resolve("qwen-voice-design");
    expect(adapter.providerId).toBe("qwen-voice-design");
  });
});
