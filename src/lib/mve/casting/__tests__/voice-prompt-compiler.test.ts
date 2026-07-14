/**
 * Tests for provider-specific voice prompt compiler.
 * Location: src/lib/mve/casting/__tests__/voice-prompt-compiler.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  compileForProvider,
  compilePerformanceInstruct,
  MAX_PERFORMANCE_INSTRUCT_LENGTH,
  voiceProfileUsesIdentityInstruct,
} from "../voice-prompt-compiler";

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

describe("compilePerformanceInstruct", () => {
  it("combines identity and direction for designed profiles", () => {
    const out = compilePerformanceInstruct(
      {
        identityPrompt: "warm female narrator",
        creationMode: "designed",
      },
      { emotion: "tense", pace: "slow", directorNote: "irritated delivery" },
    );
    expect(out.instruct).toContain("Voice identity: warm female narrator");
    expect(out.instruct).toContain("Performance:");
    expect(out.instruct).toContain("irritated delivery");
    expect(out.instruct).toContain("emotion: tense");
    expect(out.instruct).toContain("pace: slow");
  });

  it("returns identity-only instruct without direction", () => {
    const out = compilePerformanceInstruct(
      { identityPrompt: "deep male voice", creationMode: "cloned" },
      undefined,
    );
    expect(out.instruct).toBe("Voice identity: deep male voice");
    expect(out.warnings).toBeUndefined();
  });

  it("returns direction-only instruct for preset profiles", () => {
    const out = compilePerformanceInstruct(
      { creationMode: "preset", profileType: "default" },
      { pace: "fast", emotion: "excited" },
    );
    expect(out.instruct).toBe("Performance: emotion: excited; pace: fast");
    expect(out.instruct).not.toContain("Voice identity:");
  });

  it("returns empty when preset has no direction", () => {
    const out = compilePerformanceInstruct(
      { creationMode: "preset", profileType: "default" },
      undefined,
    );
    expect(out.instruct).toBeUndefined();
  });

  it("truncates long directorNote with warning", () => {
    const longNote = "x".repeat(MAX_PERFORMANCE_INSTRUCT_LENGTH + 50);
    const out = compilePerformanceInstruct(
      { identityPrompt: "voice", creationMode: "designed" },
      { directorNote: longNote },
    );
    expect(out.instruct?.length).toBe(MAX_PERFORMANCE_INSTRUCT_LENGTH);
    expect(out.warnings?.[0]).toContain("gekürzt");
  });
});

describe("voiceProfileUsesIdentityInstruct", () => {
  it("is true for designed and cloned", () => {
    expect(voiceProfileUsesIdentityInstruct({ creationMode: "designed" })).toBe(
      true,
    );
    expect(voiceProfileUsesIdentityInstruct({ creationMode: "cloned" })).toBe(
      true,
    );
  });

  it("is false for preset", () => {
    expect(voiceProfileUsesIdentityInstruct({ creationMode: "preset" })).toBe(
      false,
    );
  });
});
