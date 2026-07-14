/**
 * Tests for VoiceCreationRegistry.
 * Location: src/lib/multi-voice-engine/adapters/__tests__/voice-creation-registry.test.ts
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { VoiceCreationAdapter } from "../voice-creation-adapter";
import { UnknownVoiceCreationProviderError } from "../voice-creation-adapter";
import {
  VoiceCreationRegistry,
  resetDefaultVoiceCreationRegistryForTests,
} from "../voice-creation-registry";

const stubAdapter: VoiceCreationAdapter = {
  providerId: "qwen-voice-design",
  capabilities: {
    supportsVoiceDesign: true,
    supportsMaterialize: true,
    maxCandidateCount: 4,
  },
  generateCandidates: async () => ({
    sessionId: "sess_1",
    candidates: [],
  }),
  materialize: async () => ({
    referenceAudioAssetId: "asset_1",
    referenceAudioUrl: "local://ref.wav",
    referenceText: "Hi",
    identityPrompt: "Female voice",
  }),
};

describe("VoiceCreationRegistry", () => {
  beforeEach(() => {
    resetDefaultVoiceCreationRegistryForTests();
  });

  it("resolves registered provider", () => {
    const registry = new VoiceCreationRegistry();
    registry.register(stubAdapter);
    expect(registry.resolve("qwen-voice-design").providerId).toBe(
      "qwen-voice-design",
    );
  });

  it("throws for unknown provider", () => {
    const registry = new VoiceCreationRegistry();
    expect(() => registry.resolve("missing")).toThrow(
      UnknownVoiceCreationProviderError,
    );
  });
});
