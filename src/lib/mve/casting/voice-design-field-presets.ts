/**
 * Curated preset options for Advanced voice design fields (DE label → EN compiler value).
 * Location: src/lib/mve/casting/voice-design-field-presets.ts
 */

export interface VoiceDesignPreset {
  label: string;
  value: string;
}

export type VoiceDesignPresetFieldKey =
  | "nativeLanguage"
  | "nativeDialect"
  | "genderPresentation"
  | "ageRange"
  | "recordingQuality"
  | "personaRole"
  | "personaAttitude"
  | "pitch"
  | "resonance"
  | "weight"
  | "timbre"
  | "texture"
  | "breath"
  | "articulation"
  | "pace"
  | "rhythm"
  | "pauses"
  | "intonation"
  | "emphasis"
  | "energy"
  | "proximity"
  | "avoid";

export const VOICE_DESIGN_CUSTOM_PRESET = "__custom__";

export const VOICE_DESIGN_FIELD_PRESETS: Record<
  VoiceDesignPresetFieldKey,
  VoiceDesignPreset[]
> = {
  nativeLanguage: [
    { label: "Deutsch", value: "German" },
    { label: "Englisch", value: "English" },
    { label: "Französisch", value: "French" },
    { label: "Spanisch", value: "Spanish" },
  ],
  nativeDialect: [
    { label: "Neutral (DE)", value: "neutral Standard German" },
    { label: "Leicht österreichisch", value: "light Austrian German" },
    { label: "Leicht schweizerisch", value: "light Swiss German" },
    { label: "US Englisch", value: "neutral American English" },
    { label: "UK Englisch", value: "neutral British English" },
  ],
  genderPresentation: [
    { label: "Männlich wirkend", value: "Male-presenting voice" },
    { label: "Weiblich wirkend", value: "Female-presenting voice" },
    { label: "Neutral", value: "Neutral-presenting voice" },
    { label: "Androgyn", value: "Androgynous-presenting voice" },
  ],
  ageRange: [
    { label: "18–25", value: "perceived age 18–25" },
    { label: "25–35", value: "perceived age 25–35" },
    { label: "35–50", value: "perceived age 35–50" },
    { label: "50–65", value: "perceived age 50–65" },
    { label: "65+", value: "perceived age 65+" },
  ],
  recordingQuality: [
    {
      label: "Studio, trocken",
      value: "Studio-quality, clean and dry recording",
    },
    {
      label: "Studio, warm & nah",
      value: "Studio-quality, warm and close recording",
    },
    {
      label: "Podcast-Nähe",
      value: "Close-mic podcast-style recording",
    },
    {
      label: "Natürlich / leicht Raum",
      value: "Natural room tone, lightly ambient",
    },
  ],
  personaRole: [
    { label: "Erzähler", value: "narrator" },
    { label: "Dokumentar-Erzähler", value: "documentary narrator" },
    { label: "Freundlicher Assistent", value: "approachable assistant" },
    { label: "Nachrichtensprecher", value: "news presenter" },
    { label: "Charakterstimme", value: "character voice actor" },
  ],
  personaAttitude: [
    { label: "Warm, entspannt", value: "warm, relaxed, sincere" },
    { label: "Ruhig, vertrauensvoll", value: "calm, reflective, trustworthy" },
    { label: "Energisch, freundlich", value: "energetic, upbeat, friendly" },
    { label: "Sachlich, klar", value: "clear, matter-of-fact, professional" },
    { label: "Verspielt, leicht", value: "playful, light, curious" },
  ],
  pitch: [
    { label: "Tief", value: "Low pitch" },
    { label: "Mittel-tief", value: "Mid-low pitch" },
    { label: "Mittel", value: "Mid pitch" },
    { label: "Mittel-hoch", value: "Mid-high pitch" },
    { label: "Hoch", value: "High pitch" },
  ],
  resonance: [
    { label: "Brustresonanz, warm", value: "Warm chest resonance" },
    { label: "Nasal, hell", value: "Bright nasal resonance" },
    { label: "Rund, voll", value: "Round full resonance" },
    { label: "Kopfstimme, leicht", value: "Light head voice resonance" },
  ],
  weight: [
    { label: "Leicht", value: "Light vocal weight" },
    { label: "Mittel", value: "Medium vocal weight" },
    { label: "Voll, kräftig", value: "Full-bodied vocal weight" },
    { label: "Schwer, wuchtig", value: "Heavy substantial vocal weight" },
  ],
  timbre: [
    { label: "Warm, mellow", value: "Warm mellow timbre" },
    { label: "Klar, hell", value: "Clear bright timbre" },
    { label: "Rauchig, gravelly", value: "Slightly gravelly timbre" },
    { label: "Weich, freundlich", value: "Soft friendly timbre" },
  ],
  texture: [
    { label: "Glatt", value: "Smooth vocal texture" },
    { label: "Leicht rau", value: "Slightly rough texture" },
    { label: "Luftig", value: "Airy light texture" },
    { label: "Samtig", value: "Velvety smooth texture" },
  ],
  breath: [
    { label: "Kaum hörbar", value: "Minimal audible breath" },
    { label: "Sanft, natürlich", value: "Gentle natural breath" },
    { label: "Intim, nah", value: "Intimate close breath texture" },
  ],
  articulation: [
    { label: "Klar, deutlich", value: "Clear precise articulation" },
    { label: "Natürlich, locker", value: "Natural relaxed articulation" },
    { label: "Langsam, bedächtig", value: "Slow deliberate articulation" },
    { label: "Schnell, wendig", value: "Quick agile articulation" },
  ],
  pace: [
    { label: "Langsam", value: "Slow deliberate pacing" },
    { label: "Gemächlich", value: "Leisurely unhurried pacing" },
    { label: "Konversationell", value: "Natural conversational pacing" },
    { label: "Zügig", value: "Brisk energetic pacing" },
  ],
  rhythm: [
    { label: "Gleichmäßig", value: "Even steady rhythm" },
    { label: "Erzählerisch", value: "Measured storytelling rhythm" },
    { label: "Locker, dialogisch", value: "Easy conversational rhythm" },
    { label: "Dynamisch", value: "Dynamic varied rhythm" },
  ],
  pauses: [
    { label: "Wenige Pausen", value: "Few short pauses" },
    { label: "Natürliche Pausen", value: "Natural conversational pauses" },
    { label: "Nachdenklich", value: "Thoughtful pauses between phrases" },
    { label: "Dramatisch", value: "Dramatic intentional pauses" },
  ],
  intonation: [
    { label: "Weich, fallend", value: "Soft downward intonation" },
    { label: "Neutral", value: "Neutral even intonation" },
    { label: "Lebendig, variierend", value: "Lively varied intonation" },
    { label: "Fragenbetont", value: "Gentle rises on questions" },
  ],
  emphasis: [
    { label: "Dezent", value: "Subtle word emphasis" },
    { label: "Natürlich", value: "Natural light emphasis" },
    { label: "Ausdrucksstark", value: "Expressive deliberate emphasis" },
  ],
  energy: [
    { label: "Niedrig, ruhig", value: "Low steady energy" },
    { label: "Moderat", value: "Moderate inviting energy" },
    { label: "Hoch, lebendig", value: "High lively energy" },
  ],
  proximity: [
    { label: "Nah am Mikro", value: "Close-mic intimate proximity" },
    { label: "Mittel", value: "Medium conversational proximity" },
    { label: "Weiter weg", value: "Slightly distant room proximity" },
  ],
  avoid: [
    { label: "Keine Werbestimme", value: "No announcer voice" },
    { label: "Keine Übertreibung", value: "No exaggerated enthusiasm" },
    { label: "Nicht zu theatralisch", value: "No theatrical overacting" },
    { label: "Nicht monoton", value: "No monotone delivery" },
    { label: "Nicht zu schnell", value: "No rushed speech" },
  ],
};

export function resolvePresetSelectValue(
  value: string,
  presets: VoiceDesignPreset[],
): string {
  const trimmed = value.trim();
  if (!trimmed) return VOICE_DESIGN_CUSTOM_PRESET;
  const match = presets.find((p) => p.value === trimmed);
  return match?.value ?? VOICE_DESIGN_CUSTOM_PRESET;
}
