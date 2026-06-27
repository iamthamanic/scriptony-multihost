/**
 * Rules-based extraction of MveVoiceAttributes from a natural-language description.
 * Location: src/lib/mve/casting/extract-voice-attributes-from-description.ts
 */

import type { MveVoiceAttributes } from "@/lib/multi-voice-engine/schema/voice-profile";

function includesAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(term));
}

/** MVP: keyword heuristics for DE/EN voice casting descriptions. */
export function extractVoiceAttributesFromDescription(
  description: string,
): MveVoiceAttributes {
  const text = description.trim().toLowerCase();
  const attributes: MveVoiceAttributes = {};

  if (
    includesAny(text, [
      "weiblich",
      "frau",
      "female",
      "woman",
      "girl",
      "lady",
      "ermittlerin",
      "mutter",
      "tochter",
    ])
  ) {
    attributes.genderPresentation = "female";
  } else if (
    includesAny(text, [
      "männlich",
      "mann",
      "male",
      "man",
      "boy",
      "vater",
      "sohn",
      "ermittler",
    ])
  ) {
    attributes.genderPresentation = "male";
  } else if (includesAny(text, ["androgyn", "neutral"])) {
    attributes.genderPresentation = "androgynous";
  }

  if (includesAny(text, ["kind", "child", "mädchen"])) {
    attributes.ageImpression = "child";
  } else if (
    includesAny(text, [
      "jung",
      "junger",
      "junge frau",
      "young",
      "teen",
      "zwanzig",
      "20er",
      "student",
    ])
  ) {
    attributes.ageImpression = "young_adult";
  } else if (
    includesAny(text, [
      "mitte",
      "middle",
      "30",
      "40",
      "erwachsen",
      "adult",
      "reif",
    ])
  ) {
    attributes.ageImpression = "middle_aged";
  } else if (
    includesAny(text, ["älter", "alt", "senior", "elderly", "oma", "opa", "70"])
  ) {
    attributes.ageImpression = "elderly";
  }

  if (includesAny(text, ["sehr langsam", "x_slow", "schleppend"])) {
    attributes.pace = "x_slow";
  } else if (includesAny(text, ["langsam", "slow", "ruhig", "bedächtig"])) {
    attributes.pace = "slow";
  } else if (includesAny(text, ["schnell", "fast", "eilig", "hektisch"])) {
    attributes.pace = "fast";
  } else if (includesAny(text, ["sehr schnell", "x_fast"])) {
    attributes.pace = "x_fast";
  } else if (includesAny(text, ["medium", "normal", "moderat"])) {
    attributes.pace = "medium";
  }

  if (includesAny(text, ["energisch", "laut", "high energy", "lebhaft"])) {
    attributes.energy = "high";
  } else if (includesAny(text, ["ruhig", "calm", "sanft", "leise", "soft"])) {
    attributes.energy = "low";
  } else if (includesAny(text, ["sehr ruhig", "very calm"])) {
    attributes.energy = "very_low";
  }

  if (includesAny(text, ["britisch", "uk", "british"])) {
    attributes.accent = "british";
  } else if (includesAny(text, ["deutsch", "german"])) {
    attributes.accent = "german";
  }

  if (includesAny(text, ["warm", "warme"])) {
    attributes.texture = "warm";
  } else if (includesAny(text, ["rau", "rough", "heiser"])) {
    attributes.texture = "rough";
  } else if (includesAny(text, ["klar", "clean", "deutlich"])) {
    attributes.texture = "clean";
  }

  return attributes;
}
