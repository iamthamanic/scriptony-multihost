/**
 * Tests for Voicebox/Kokoro-preset voice matching from description.
 * Location: src/lib/mve/casting/__tests__/match-voice-from-description.test.ts
 */

import { describe, expect, it } from "vitest";
import type { VoiceEntry } from "@/lib/api/voice-entry";
import { matchVoiceFromDescription } from "../match-voice-from-description";

const TEST_VOICE_CATALOG: VoiceEntry[] = [
  { id: "af_bella", name: "Bella", lang: "de", gender: "female" },
  { id: "af_sky", name: "Sky", lang: "de", gender: "female" },
  { id: "am_adam", name: "Adam", lang: "de", gender: "male" },
  { id: "bm_george", name: "George", lang: "en-gb", gender: "male" },
  { id: "bf_emma", name: "Emma", lang: "en-gb", gender: "female" },
];

describe("matchVoiceFromDescription", () => {
  it("prefers female voice for Ermittlerin description", () => {
    const result = matchVoiceFromDescription({
      description: "ruhige deutsche Ermittlerin, Mitte 30",
      voices: TEST_VOICE_CATALOG,
    });
    expect(result).not.toBeNull();
    expect(result!.voice.gender).toBe("female");
    expect(result!.attributes.genderPresentation).toBe("female");
  });

  it("prefers UK voice when british accent is requested", () => {
    const result = matchVoiceFromDescription({
      description: "calm british male narrator",
      voices: TEST_VOICE_CATALOG,
    });
    expect(result).not.toBeNull();
    expect(result!.voice.lang).toContain("gb");
    expect(result!.voice.gender).toBe("male");
  });

  it("returns null for empty description", () => {
    expect(
      matchVoiceFromDescription({
        description: "   ",
        voices: TEST_VOICE_CATALOG,
      }),
    ).toBeNull();
  });

  it("falls back to a voice when match is weak but still returns catalog entry", () => {
    const result = matchVoiceFromDescription({
      description: "Stimme für Weltraum-Roboter XYZ-9000",
      voices: TEST_VOICE_CATALOG,
    });
    expect(result).not.toBeNull();
    expect(result!.voice.id).toBeTruthy();
    expect(result!.weakMatch).toBe(true);
  });
});
