/**
 * Tests for Kokoro voice matching from description.
 * Location: src/lib/mve/casting/__tests__/match-voice-from-description.test.ts
 */

import { describe, expect, it } from "vitest";
import { KOKORO_VOICE_CATALOG } from "@/lib/api/kokoro-voice-catalog";
import { matchVoiceFromDescription } from "../match-voice-from-description";

describe("matchVoiceFromDescription", () => {
  it("prefers female voice for Ermittlerin description", () => {
    const result = matchVoiceFromDescription({
      description: "ruhige deutsche Ermittlerin, Mitte 30",
      voices: KOKORO_VOICE_CATALOG,
    });
    expect(result).not.toBeNull();
    expect(result!.voice.gender).toBe("female");
    expect(result!.attributes.genderPresentation).toBe("female");
  });

  it("prefers UK voice when british accent is requested", () => {
    const result = matchVoiceFromDescription({
      description: "calm british male narrator",
      voices: KOKORO_VOICE_CATALOG,
    });
    expect(result).not.toBeNull();
    expect(result!.voice.lang).toContain("gb");
    expect(result!.voice.gender).toBe("male");
  });

  it("returns null for empty description", () => {
    expect(
      matchVoiceFromDescription({
        description: "   ",
        voices: KOKORO_VOICE_CATALOG,
      }),
    ).toBeNull();
  });

  it("falls back to a voice when match is weak but still returns catalog entry", () => {
    const result = matchVoiceFromDescription({
      description: "Stimme für Weltraum-Roboter XYZ-9000",
      voices: KOKORO_VOICE_CATALOG,
    });
    expect(result).not.toBeNull();
    expect(result!.voice.id).toBeTruthy();
    expect(result!.weakMatch).toBe(true);
  });
});
