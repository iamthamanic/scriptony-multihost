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
} as const satisfies Record<string, VoiceDesignFieldHelp>;
