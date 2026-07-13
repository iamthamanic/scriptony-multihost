/**
 * Tooltip copy for Advanced voice design fields (DE UI).
 * Location: src/lib/mve/casting/voice-design-field-help.ts
 */

export interface VoiceDesignFieldHelp {
  label: string;
  tooltip: string;
  example: string;
  placeholder?: string;
}

export const VOICE_DESIGN_DESCRIPTION_MAX_LENGTH = 2000;

/**
 * Worst-case suffix appended per candidate (A/B/C + retry hint).
 * Keep in sync with voice-design-candidate-variation.ts.
 */
export const VOICE_DESIGN_CANDIDATE_VARIATION_RESERVE = 197;

/** Max user-authored prompt before Scriptony appends candidate variation blocks. */
export const VOICE_DESIGN_BASE_PROMPT_MAX_LENGTH =
  VOICE_DESIGN_DESCRIPTION_MAX_LENGTH -
  VOICE_DESIGN_CANDIDATE_VARIATION_RESERVE;

/** Clamp compiled/basic design prompt before variation suffix is added. */
export function clampVoiceDesignBasePrompt(value: string): string {
  return value.slice(0, VOICE_DESIGN_BASE_PROMPT_MAX_LENGTH);
}

/** @deprecated Use clampVoiceDesignBasePrompt — basic field shares the base limit. */
export function clampVoiceDesignDescription(value: string): string {
  return clampVoiceDesignBasePrompt(value);
}

export const VOICE_DESIGN_FIELD_HELP = {
  nativeLanguage: {
    label: "Sprache",
    tooltip:
      "Zielsprache und Dialekt der Stimme. Beeinflusst Aussprache und Melodie.",
    example: "German, neutral Standard German",
    placeholder: "z. B. Deutsch, Standarddeutsch",
  },
  nativeDialect: {
    label: "Dialekt / Variante",
    tooltip: "Regionale Färbung oder neutrale Hochsprache.",
    example: "neutral Standard German",
    placeholder: "z. B. neutral, leicht österreichisch",
  },
  genderPresentation: {
    label: "Stimmliche Präsentation",
    tooltip: "Wie die Stimme wahrgenommen wird — unabhängig vom Charakter.",
    example: "Male-presenting voice",
    placeholder: "z. B. männlich wirkend",
  },
  ageRange: {
    label: "Wahrgenommenes Alter",
    tooltip: "Altersbereich, den Hörer assoziieren — nicht nur Tonhöhe.",
    example: "perceived age 22–28",
    placeholder: "z. B. 25–35",
  },
  recordingQuality: {
    label: "Aufnahmequalität",
    tooltip: "Wie die Aufnahme klingt — trocken, Studio, nah am Mikro.",
    example: "Studio-quality, clean and close recording",
    placeholder: "z. B. Studio, trocken, nah",
  },
  personaRole: {
    label: "Persona / Rolle",
    tooltip: "Charaktertyp oder Beruf des Sprechers.",
    example: "approachable young narrator",
    placeholder: "z. B. ruhiger Erzähler",
  },
  personaAttitude: {
    label: "Grundhaltung",
    tooltip: "2–4 Eigenschaften, kommagetrennt.",
    example: "warm, relaxed, sincere",
    placeholder: "warm, entspannt, aufrichtig",
  },
  voiceIdentity: {
    label: "Voice identity",
    tooltip:
      "Physische Klangqualität: Tonhöhe, Resonanz, Gewicht, Textur, Artikulation.",
    example: "Mid-low pitch, warm mellow timbre, clear articulation",
    placeholder: "Tonhöhe, Resonanz, Klangfarbe …",
  },
  delivery: {
    label: "Delivery",
    tooltip: "Sprechweise für die Identität — Tempo, Rhythmus, Energie.",
    example: "Natural conversational pacing, soft intonation",
    placeholder: "Tempo, Rhythmus, Betonung …",
  },
  avoid: {
    label: "Avoid",
    tooltip:
      "Unerwünschte Merkmale — hilft dem Compiler, auch wenn nicht jedes Modell es zuverlässig vermeidet.",
    example: "No announcer voice, no exaggerated enthusiasm",
    placeholder: "Kein Werbestimme, keine Übertreibung …",
  },
  pitch: {
    label: "Tonhöhe",
    tooltip: "Grundfrequenz der Stimme — tief bis hoch.",
    example: "Mid-low pitch",
    placeholder: "z. B. mittel-tief",
  },
  resonance: {
    label: "Resonanz",
    tooltip: "Wo die Stimme körperlich mitschwingt.",
    example: "Warm chest resonance",
    placeholder: "z. B. warme Brustresonanz",
  },
  weight: {
    label: "Stimmgewicht",
    tooltip: "Wucht und Fülle der Stimme.",
    example: "Medium vocal weight",
    placeholder: "z. B. mittel, voll",
  },
  timbre: {
    label: "Klangfarbe",
    tooltip: "Charakteristischer Klang der Stimme.",
    example: "Warm mellow timbre",
    placeholder: "z. B. warm, mellow",
  },
  texture: {
    label: "Textur",
    tooltip: "Oberflächenqualität — glatt, rau, luftig.",
    example: "Smooth vocal texture",
    placeholder: "z. B. glatt",
  },
  breath: {
    label: "Atem",
    tooltip: "Hörbarkeit und Qualität des Atems.",
    example: "Gentle natural breath",
    placeholder: "z. B. sanft, natürlich",
  },
  articulation: {
    label: "Artikulation",
    tooltip: "Deutlichkeit und Art der Aussprache.",
    example: "Clear precise articulation",
    placeholder: "z. B. klar, deutlich",
  },
  pace: {
    label: "Tempo",
    tooltip: "Geschwindigkeit des Sprechens.",
    example: "Natural conversational pacing",
    placeholder: "z. B. konversationell",
  },
  rhythm: {
    label: "Rhythmus",
    tooltip: "Betontes Muster und Fluss.",
    example: "Measured storytelling rhythm",
    placeholder: "z. B. erzählerisch",
  },
  pauses: {
    label: "Pausen",
    tooltip: "Länge und Häufigkeit von Sprechpausen.",
    example: "Thoughtful pauses between phrases",
    placeholder: "z. B. nachdenklich",
  },
  intonation: {
    label: "Intonation",
    tooltip: "Melodische Bewegung der Stimme.",
    example: "Soft downward intonation",
    placeholder: "z. B. weich, fallend",
  },
  emphasis: {
    label: "Betonung",
    tooltip: "Wie stark einzelne Wörter hervorgehoben werden.",
    example: "Subtle word emphasis",
    placeholder: "z. B. dezent",
  },
  energy: {
    label: "Energie",
    tooltip: "Gesamtenergie und Lebendigkeit.",
    example: "Moderate inviting energy",
    placeholder: "z. B. moderat",
  },
  proximity: {
    label: "Mikro-Nähe",
    tooltip: "Wie nah oder fern die Stimme wirkt.",
    example: "Close-mic intimate proximity",
    placeholder: "z. B. nah am Mikro",
  },
} as const satisfies Record<string, VoiceDesignFieldHelp>;
