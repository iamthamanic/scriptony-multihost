/**
 * Tests for Voicebox model status German hints.
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  markVoiceboxTtsSucceeded,
  resetVoiceboxModelReadySignalForTests,
} from "../voicebox-model-ready-signal";
import {
  voiceboxModelStatusHint,
  voiceboxModelStatusShort,
} from "../voicebox-model-status";

describe("voicebox-model-status", () => {
  beforeEach(() => {
    resetVoiceboxModelReadySignalForTests();
  });
  it("returns undefined when model is loaded", () => {
    expect(
      voiceboxModelStatusHint({ modelLoaded: true, modelDownloaded: true }),
    ).toBeUndefined();
    expect(voiceboxModelStatusShort({ modelLoaded: true })).toBe("TTS bereit");
  });

  it("hints download in progress", () => {
    expect(
      voiceboxModelStatusHint({
        modelLoaded: false,
        modelDownloaded: false,
      }),
    ).toMatch(/heruntergeladen/);
  });

  it("hints unknown model state", () => {
    expect(
      voiceboxModelStatusHint({
        modelLoaded: false,
        modelDownloaded: null,
      }),
    ).toMatch(/TTS-Modell noch nicht im RAM/);
  });

  it("hides hint after successful TTS in this session", () => {
    markVoiceboxTtsSucceeded();
    expect(
      voiceboxModelStatusHint({
        modelLoaded: false,
        modelDownloaded: null,
      }),
    ).toBeUndefined();
  });
});
