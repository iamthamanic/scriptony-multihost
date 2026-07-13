/**
 * Compile MveVoiceDesignSpec or basic text into Voicebox design_prompt (English).
 * Location: src/lib/mve/casting/compile-voice-design-prompt.ts
 */

import type { MveVoiceDesignSpec } from "@/lib/multi-voice-engine/schema/voice-design-spec";
import { isVoiceDesignSpecEmpty } from "@/lib/multi-voice-engine/schema/voice-design-spec";

function line(value: string | undefined): string {
  return value?.trim() ?? "";
}

function joinParts(parts: string[], separator = ", "): string {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(separator);
}

export function compileVoiceDesignPromptFromSpec(
  spec: MveVoiceDesignSpec,
): string {
  const nativeLang = line(spec.native?.language) || "German";
  const dialect = line(spec.native?.dialect) || "neutral Standard German";
  const presentation = joinParts([
    line(spec.presentation?.genderPresentation),
    spec.presentation?.ageRange
      ? `perceived age ${line(spec.presentation.ageRange)}`
      : "",
  ]);
  const recording =
    line(spec.presentation?.recordingQuality) ||
    "studio-quality, clean recording";
  const attitude = (spec.persona?.attitude ?? []).filter(Boolean).join(", ");
  const personaRole = line(spec.persona?.role);
  const identity = joinParts([
    line(spec.voiceIdentity?.pitch),
    line(spec.voiceIdentity?.resonance),
    line(spec.voiceIdentity?.weight),
    line(spec.voiceIdentity?.timbre),
    line(spec.voiceIdentity?.texture),
    line(spec.voiceIdentity?.breath),
    line(spec.voiceIdentity?.articulation),
  ]);
  const delivery = joinParts([
    line(spec.delivery?.pace),
    line(spec.delivery?.rhythm),
    line(spec.delivery?.pauses),
    line(spec.delivery?.intonation),
    line(spec.delivery?.emphasis),
    line(spec.delivery?.energy),
    line(spec.delivery?.proximity),
  ]);
  const avoid = (spec.avoid ?? []).filter(Boolean).join(", ");

  const blocks = [
    `Native ${nativeLang}, ${dialect}.`,
    "",
    presentation ? `${presentation}.` : "",
    `${recording}.`,
    "",
    personaRole ? `Persona: ${personaRole}.` : "",
    attitude ? `Grundhaltung: ${attitude}.` : "",
    "",
    "Voice identity:",
    identity ? `${identity}.` : "",
    "",
    "Delivery:",
    delivery ? `${delivery}.` : "",
    "",
    avoid ? `Avoid:\n${avoid}.` : "",
  ];

  return blocks
    .map((b) => b.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function compileVoiceDesignPrompt(input: {
  basicDescription?: string;
  designSpec?: MveVoiceDesignSpec | null;
}): string {
  const basic = input.basicDescription?.trim() ?? "";
  if (input.designSpec && !isVoiceDesignSpecEmpty(input.designSpec)) {
    const compiled = compileVoiceDesignPromptFromSpec(input.designSpec);
    return compiled || basic;
  }
  return basic;
}
