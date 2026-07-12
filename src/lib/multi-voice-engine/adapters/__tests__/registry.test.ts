/**
 * Tests for VoiceEngineRegistry.
 * Location: src/lib/multi-voice-engine/adapters/__tests__/registry.test.ts
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  VoiceEngineRegistry,
  resetDefaultVoiceEngineRegistryForTests,
} from "../registry";
import { dummyVoiceEngineAdapter } from "../dummy.adapter";
import { UnknownVoiceEngineError } from "../voice-engine-adapter";

describe("VoiceEngineRegistry", () => {
  beforeEach(() => {
    resetDefaultVoiceEngineRegistryForTests();
  });

  it("resolves registered adapter", () => {
    const registry = new VoiceEngineRegistry();
    registry.register(dummyVoiceEngineAdapter);
    expect(registry.resolve("dummy").engineName).toBe("dummy");
  });

  it("throws for unknown engine", () => {
    const registry = new VoiceEngineRegistry();
    expect(() => registry.resolve("piper")).toThrow(UnknownVoiceEngineError);
  });

  it("defaults to voicebox when engine empty", () => {
    const registry = new VoiceEngineRegistry();
    registry.register({
      engineName: "voicebox",
      capabilities: dummyVoiceEngineAdapter.capabilities,
      renderLine: dummyVoiceEngineAdapter.renderLine.bind(
        dummyVoiceEngineAdapter,
      ),
    });
    expect(registry.resolve("").engineName).toBe("voicebox");
  });
});
