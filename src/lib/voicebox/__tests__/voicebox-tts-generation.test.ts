/**
 * Tests for Voicebox TTS generation timeout helpers.
 * Location: src/lib/voicebox/__tests__/voicebox-tts-generation.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  VOICEBOX_GENERATION_TIMEOUT_MS,
  voiceboxGenerationProgressMessage,
  voiceboxGenerationTimeoutMessage,
} from "../voicebox-tts-generation";

describe("voicebox-tts-generation", () => {
  it("allows five minutes per generation attempt", () => {
    expect(VOICEBOX_GENERATION_TIMEOUT_MS).toBe(300_000);
  });

  it("shows cold-start copy after 15s when model likely cold", () => {
    expect(voiceboxGenerationProgressMessage(20_000, true)).toMatch(
      /TTS-Modell wird geladen/,
    );
  });

  it("shows patience copy after two minutes", () => {
    expect(voiceboxGenerationProgressMessage(130_000, true)).toMatch(
      /Kaltstart/,
    );
  });

  it("distinguishes cold-start final timeout from generic timeout", () => {
    expect(voiceboxGenerationTimeoutMessage(true, true)).toMatch(
      /nicht rechtzeitig geladen/,
    );
    expect(voiceboxGenerationTimeoutMessage(false, true)).toMatch(
      /Zeitüberschreitung/,
    );
  });

  it("uses retry message before final attempt", () => {
    expect(voiceboxGenerationTimeoutMessage(true, false)).toMatch(/erneut/);
  });
});
