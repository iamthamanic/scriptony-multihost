/**
 * Golden tests for voice design prompt compiler.
 * Location: src/lib/mve/casting/__tests__/compile-voice-design-prompt.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  compileVoiceDesignPrompt,
  compileVoiceDesignPromptFromSpec,
} from "../compile-voice-design-prompt";
import type { MveVoiceDesignSpec } from "@/lib/multi-voice-engine/schema/voice-design-spec";

const elderNarratorSpec: MveVoiceDesignSpec = {
  native: { language: "German", dialect: "neutral Standard German" },
  presentation: {
    genderPresentation: "Male-presenting voice",
    ageRange: "60–70",
    recordingQuality: "Studio-quality, warm and intimate",
  },
  persona: {
    role: "wise elder narrator",
    attitude: ["calm", "reflective", "trustworthy"],
  },
  voiceIdentity: {
    pitch: "Low-mid pitch",
    resonance: "Warm chest resonance",
    weight: "Full-bodied",
    timbre: "Mellow, slightly gravelly",
    texture: "Smooth with gentle breath",
    articulation: "Clear, unhurried",
  },
  delivery: {
    pace: "Slow, deliberate",
    rhythm: "Measured storytelling rhythm",
    pauses: "Thoughtful pauses between phrases",
    intonation: "Soft downward endings",
    emphasis: "Subtle word stress",
    energy: "Low, steady",
    proximity: "Close-mic, intimate",
  },
  avoid: ["No announcer voice", "No exaggerated drama"],
};

const youngWarmManSpec: MveVoiceDesignSpec = {
  native: { language: "German", dialect: "neutral Standard German" },
  presentation: {
    genderPresentation: "Male-presenting voice",
    ageRange: "22–28",
    recordingQuality: "Studio-quality, clean and close recording",
  },
  persona: {
    role: "approachable young narrator",
    attitude: ["warm", "relaxed", "sincere"],
  },
  voiceIdentity: {
    pitch: "Mid-low pitch",
    resonance: "Warm mellow timbre",
    weight: "Medium weight",
    timbre: "Soft and friendly",
    texture: "Clean",
    articulation: "Natural, clear",
  },
  delivery: {
    pace: "Natural conversational pacing",
    rhythm: "Easy flow",
    pauses: "Light conversational pauses",
    intonation: "Gentle rises on questions",
    emphasis: "Soft emphasis on key words",
    energy: "Moderate, inviting",
    proximity: "Close, personal",
  },
  avoid: ["No hype", "No sales tone"],
};

describe("compileVoiceDesignPromptFromSpec", () => {
  it("compiles elder narrator golden prompt", () => {
    const out = compileVoiceDesignPromptFromSpec(elderNarratorSpec);
    expect(out).toContain("Native German, neutral Standard German.");
    expect(out).toContain("Male-presenting voice");
    expect(out).toContain("wise elder narrator");
    expect(out).toContain("Voice identity:");
    expect(out).toContain("Low-mid pitch");
    expect(out).toContain("Avoid:");
    expect(out).toContain("No announcer voice");
  });

  it("compiles young warm man golden prompt", () => {
    const out = compileVoiceDesignPromptFromSpec(youngWarmManSpec);
    expect(out).toContain("approachable young narrator");
    expect(out).toContain("warm, relaxed, sincere");
    expect(out).toContain("Mid-low pitch");
    expect(out).toContain("No hype");
  });
});

describe("compileVoiceDesignPrompt", () => {
  it("prefers advanced spec over basic text when spec is non-empty", () => {
    const out = compileVoiceDesignPrompt({
      basicDescription: "ignored when spec filled",
      designSpec: youngWarmManSpec,
    });
    expect(out).toContain("approachable young narrator");
    expect(out).not.toContain("ignored when spec filled");
  });

  it("falls back to basic description when spec empty", () => {
    const out = compileVoiceDesignPrompt({
      basicDescription: "warme ruhige Erzählerstimme",
      designSpec: null,
    });
    expect(out).toBe("warme ruhige Erzählerstimme");
  });
});
