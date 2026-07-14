/**
 * Tests for provider-specific voice prompt compiler.
 * Location: src/lib/mve/casting/__tests__/voice-prompt-compiler.test.ts
 */

import { describe, expect, it } from "vitest";
import { compileForProvider } from "../voice-prompt-compiler";

describe("compileForProvider", () => {
  it("returns design prompt and render settings for voicebox", () => {
    const out = compileForProvider("voicebox", {
      basicDescription: "warm narrator",
      designSpec: null,
    });
    expect(out.designPrompt).toBe("warm narrator");
  });

  it("returns render settings from advanced technical fields", () => {
    const out = compileForProvider("voicebox", {
      basicDescription: "warm narrator",
      designSpec: {
        native: { language: "German" },
        technical: { seed: 42, guidance: 0.5 },
      },
    });
    expect(out.designPrompt).toContain("German");
    expect(out.renderSettings?.seed).toBe(42);
    expect(out.renderSettings?.guidance).toBe(0.5);
  });

  it("returns instruct for qwen custom voice", () => {
    const out = compileForProvider("qwen_custom_voice", {
      basicDescription: "calm voice",
    });
    expect(out.instruct).toContain("calm voice");
    expect(out.hint).toBeTruthy();
  });

  it("returns frozen hint for elevenlabs", () => {
    const out = compileForProvider("elevenlabs", {
      basicDescription: "test",
    });
    expect(out.hint).toContain("eingefroren");
  });
});
