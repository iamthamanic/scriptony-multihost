/**
 * Score Voicebox voice catalog entries against extracted attributes and description text.
 * Location: src/lib/mve/casting/match-voice-from-description.ts
 */

import type { VoiceEntry } from "@/lib/api/voice-entry";
import type { MveVoiceAttributes } from "@/lib/multi-voice-engine/schema/voice-profile";
import { extractVoiceAttributesFromDescription } from "./extract-voice-attributes-from-description";

export interface MatchVoiceFromDescriptionInput {
  description: string;
  voices: VoiceEntry[];
  attributes?: MveVoiceAttributes;
}

export interface MatchVoiceFromDescriptionResult {
  voice: VoiceEntry;
  score: number;
  attributes: MveVoiceAttributes;
  /** True when best score is weak — caller may show DE hint. */
  weakMatch: boolean;
}

const WEAK_MATCH_THRESHOLD = 5;

function scoreVoice(
  voice: VoiceEntry,
  attributes: MveVoiceAttributes,
  descriptionLower: string,
): number {
  let score = 0;
  const voiceGender = voice.gender.toLowerCase();

  if (attributes.genderPresentation === "female" && voiceGender === "female") {
    score += 12;
  } else if (
    attributes.genderPresentation === "male" &&
    voiceGender === "male"
  ) {
    score += 12;
  } else if (
    attributes.genderPresentation &&
    voiceGender !== attributes.genderPresentation
  ) {
    score -= 4;
  }

  if (attributes.accent === "british" && voice.lang.includes("gb")) {
    score += 8;
  } else if (attributes.accent === "german" && voice.lang.startsWith("de")) {
    score += 8;
  }

  const nameLower = voice.name.toLowerCase();
  const idLower = voice.id.toLowerCase();
  if (descriptionLower.includes(nameLower.split(" ")[0] ?? "")) {
    score += 6;
  }
  if (descriptionLower.includes(idLower.replace(/_/g, " "))) {
    score += 4;
  }

  if (
    attributes.ageImpression === "elderly" &&
    includesAny(nameLower, ["george", "michael", "nicole"])
  ) {
    score += 2;
  }
  if (
    attributes.ageImpression === "young_adult" &&
    includesAny(nameLower, ["sky", "liam", "bella"])
  ) {
    score += 2;
  }

  if (
    attributes.energy === "low" &&
    includesAny(nameLower, ["nicole", "emma"])
  ) {
    score += 2;
  }
  if (
    attributes.energy === "high" &&
    includesAny(nameLower, ["fenrir", "echo"])
  ) {
    score += 2;
  }

  return score;
}

function includesAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(term));
}

export function matchVoiceFromDescription(
  input: MatchVoiceFromDescriptionInput,
): MatchVoiceFromDescriptionResult | null {
  const description = input.description.trim();
  if (!description || input.voices.length === 0) {
    return null;
  }

  const attributes =
    input.attributes ?? extractVoiceAttributesFromDescription(description);
  const descriptionLower = description.toLowerCase();

  let best = input.voices[0]!;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const voice of input.voices) {
    const score = scoreVoice(voice, attributes, descriptionLower);
    if (score > bestScore) {
      bestScore = score;
      best = voice;
    }
  }

  return {
    voice: best,
    score: bestScore,
    attributes,
    weakMatch: bestScore < WEAK_MATCH_THRESHOLD,
  };
}
