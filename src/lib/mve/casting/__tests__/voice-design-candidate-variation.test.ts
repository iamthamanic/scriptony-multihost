/**
 * Tests for voice design candidate prompt variation.
 * Location: src/lib/mve/casting/__tests__/voice-design-candidate-variation.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  voiceDesignCandidatePrompt,
  voiceDesignCandidateTtsSeed,
} from "../voice-design-candidate-variation";

describe("voiceDesignCandidatePrompt", () => {
  it("appends distinct variant blocks for A/B/C", () => {
    const base = "Warm narrator voice.";
    const a = voiceDesignCandidatePrompt(base, 0);
    const b = voiceDesignCandidatePrompt(base, 1);
    const c = voiceDesignCandidatePrompt(base, 2);

    expect(a).toContain("variant A");
    expect(b).toContain("variant B");
    expect(c).toContain("variant C");
    expect(a).not.toEqual(b);
    expect(b).not.toEqual(c);
  });

  it("adds retry hint on regeneration attempts", () => {
    const prompt = voiceDesignCandidatePrompt("Base voice.", 1, 2);
    expect(prompt).toContain("Alternate voice identity");
  });
});

describe("voiceDesignCandidateTtsSeed", () => {
  it("spreads seeds across candidates and retries", () => {
    expect(voiceDesignCandidateTtsSeed(0, 0)).not.toBe(
      voiceDesignCandidateTtsSeed(1, 0),
    );
    expect(voiceDesignCandidateTtsSeed(0, 0)).not.toBe(
      voiceDesignCandidateTtsSeed(0, 1),
    );
  });
});
