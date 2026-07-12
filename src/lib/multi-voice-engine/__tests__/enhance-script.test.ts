/**
 * Tests for MVE Enhance Script schema + guardrails.
 * Location: src/lib/multi-voice-engine/__tests__/enhance-script.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  MveEnhanceScriptResultSchema,
  MveEnhanceScriptRequestSchema,
} from "../schema/enhance-script";
import {
  applyEnhanceGuardrails,
  collectSpeakerLabels,
  extractJsonObject,
} from "@/lib/mve/enhance-script-guardrails";

describe("MveEnhanceScriptRequestSchema", () => {
  it("accepts minimal request", () => {
    const result = MveEnhanceScriptRequestSchema.safeParse({
      projectId: "proj_1",
      rawText: "MAX: Hallo.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty rawText", () => {
    const result = MveEnhanceScriptRequestSchema.safeParse({
      projectId: "proj_1",
      rawText: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("MveEnhanceScriptResultSchema", () => {
  it("accepts characters and lines", () => {
    const result = MveEnhanceScriptResultSchema.safeParse({
      characters: [{ tempId: "char_1", name: "Max", roleType: "character" }],
      lines: [
        {
          orderIndex: 0,
          type: "dialogue",
          characterTempId: "char_1",
          text: "Hallo.",
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("collectSpeakerLabels", () => {
  it("finds ALL CAPS speaker prefixes", () => {
    expect(
      collectSpeakerLabels("MAX: Test\nMara: lowercase ignored\nERZÄHLER: Hi"),
    ).toEqual(["MAX", "ERZÄHLER"]);
  });
});

describe("extractJsonObject", () => {
  it("parses fenced JSON", () => {
    const parsed = extractJsonObject('```json\n{"a":1}\n```');
    expect(parsed).toEqual({ a: 1 });
  });
});

describe("applyEnhanceGuardrails", () => {
  it("warns when speaker label missing from characters", () => {
    const result = MveEnhanceScriptResultSchema.parse({
      characters: [{ tempId: "char_1", name: "Mara", roleType: "character" }],
      lines: [
        {
          orderIndex: 0,
          characterTempId: "char_1",
          text: "Ja.",
          type: "dialogue",
        },
      ],
    });
    const warnings = applyEnhanceGuardrails("MAX: Wo bist du?", result);
    expect(warnings.some((w) => w.includes("MAX"))).toBe(true);
  });
});
