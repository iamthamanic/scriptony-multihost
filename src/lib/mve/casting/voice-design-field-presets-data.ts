/**
 * Preset catalog with layperson hints for Voice Design Advanced fields.
 * Location: src/lib/mve/casting/voice-design-field-presets-data.ts
 */

import type {
  VoiceDesignPreset,
  VoiceDesignPresetFieldKey,
} from "./voice-design-field-presets";

function p(label: string, value: string, hint: string): VoiceDesignPreset {
  return { label, value, hint };
}

export const VOICE_DESIGN_FIELD_PRESETS: Record<
  VoiceDesignPresetFieldKey,
  VoiceDesignPreset[]
> = {
  nativeLanguage: [
    p(
      "Deutsch",
      "German",
      "Standard-Hochdeutsch für deutsche Dialoge, Hörbücher oder Sync — wie deutsche Netflix-Serien.",
    ),
    p(
      "Englisch",
      "English",
      "Englische Aussprache für internationale Rollen — Hollywood-Film, BBC-Drama oder Games auf EN.",
    ),
    p(
      "Französisch",
      "French",
      "Französische Melodie und Lautung — für Paris-Settings, Mode-Werbung oder Arthouse.",
    ),
    p(
      "Spanisch",
      "Spanish",
      "Spanische Aussprache — für Latino-Charaktere, Telenovela-Vibe oder Reise-Doku.",
    ),
  ],
  nativeDialect: [
    p(
      "Neutral (DE)",
      "neutral Standard German",
      "Kein starker Akzent — wie Tagesschau-Moderation oder neutraler Synchronsprecher.",
    ),
    p(
      "Leicht österreichisch",
      "light Austrian German",
      "Sanfte österreichische Färbung — z. B. Wiener Charakter in Krimi oder Komödie.",
    ),
    p(
      "Leicht schweizerisch",
      "light Swiss German",
      "Dezente Schweizer Note — für Heimatgeschichten, nicht übertrieben komisch.",
    ),
    p(
      "US Englisch",
      "neutral American English",
      "General American — wie Denzel Washington in US-Thrillern oder Tech-CEO in Serien.",
    ),
    p(
      "UK Englisch",
      "neutral British English",
      "Britisch neutral — BBC-Drama, Sherlock-Vibe oder gehobener Erzähler.",
    ),
  ],
  genderPresentation: [
    p(
      "Männlich wirkend",
      "Male-presenting voice",
      "Klingt männlich für Hörer — Trailer-Stimme, Cop, Mentor; unabhängig vom Charakter-Geschlecht.",
    ),
    p(
      "Weiblich wirkend",
      "Female-presenting voice",
      "Klingt weiblich — Protagonistin in Drama, Podcast-Host oder warme Mutterfigur.",
    ),
    p(
      "Neutral",
      "Neutral-presenting voice",
      "Weder klar männlich noch weiblich — Erklärvideos, UI-Assistent, dokumentarisch.",
    ),
    p(
      "Androgyn",
      "Androgynous-presenting voice",
      "Bewusst geschlechtslos — Sci-Fi, Anime-Dub-Feeling oder künstlerische Kurzfilme.",
    ),
  ],
  ageRange: [
    p(
      "18–25",
      "perceived age 18–25",
      "Junge Stimme — Student, TikTok-Erzähler, Sidekick in Teen-Drama.",
    ),
    p(
      "25–35",
      "perceived age 25–35",
      "Junger Erwachsener — Held in Netflix-Serie, Startup-Gründer, Rom-Com-Protagonist.",
    ),
    p(
      "35–50",
      "perceived age 35–50",
      "Erfahren, im besten Alter — Detective wie in True Crime, Führungskraft, Drama-Lead.",
    ),
    p(
      "50–65",
      "perceived age 50–65",
      "Reifere Stimme — Weiser Mentor, Politiker in Thriller, Vaterfigur mit Gewicht.",
    ),
    p(
      "65+",
      "perceived age 65+",
      "Ältere Stimme — Großvater-Erzähler, historische Doku, ruhiger Rückblick.",
    ),
  ],
  recordingQuality: [
    p(
      "Studio, trocken",
      "Studio-quality, clean and dry recording",
      "Professionell ohne Hall — wie Synchronstudio oder sauberer Hörbuch-Schnitt.",
    ),
    p(
      "Studio, warm & nah",
      "Studio-quality, warm and close recording",
      "Intimes Studio — ASMR-Nähe, vertrauliches Interview, Charakter-Monolog.",
    ),
    p(
      "Podcast-Nähe",
      "Close-mic podcast-style recording",
      "Direkt ins Ohr — True-Crime-Podcast, YouTuber am Shure-Mic.",
    ),
    p(
      "Natürlich / leicht Raum",
      "Natural room tone, lightly ambient",
      "Wie am Küchentisch — Doku vor Ort, wenig künstlich, authentisch.",
    ),
  ],
  personaRole: [
    p(
      "Erzähler",
      "narrator",
      "Erzählt die Story von außen — Fantasy-Hörbuch, Trailer-Off oder Märchen.",
    ),
    p(
      "Dokumentar-Erzähler",
      "documentary narrator",
      "Sachlich erklärend — Naturdoku, Wikipedia-Style oder History-Channel.",
    ),
    p(
      "Freundlicher Assistent",
      "approachable assistant",
      "Hilfsbereit und nahbar — App-Assistent, Tutorial, Kundenservice-Bot.",
    ),
    p(
      "Nachrichtensprecher",
      "news presenter",
      "Seriös, klar — Tagesschau-Anker, Breaking News (ohne reißerische Werbung).",
    ),
    p(
      "Charakterstimme",
      "character voice actor",
      "In der Rolle sprechend — Bösewicht, Best Friend oder Antiheld in Drama-Serie.",
    ),
  ],
  personaAttitude: [
    p(
      "Warm, entspannt",
      "warm, relaxed, sincere",
      "Einladend und ehrlich — wie ein guter Freund oder Therapeut in Indie-Film.",
    ),
    p(
      "Ruhig, vertrauensvoll",
      "calm, reflective, trustworthy",
      "Morgan-Freeman-Erzähler-Vibe — Weisheit, Doku, emotionaler Rückblick.",
    ),
    p(
      "Energisch, freundlich",
      "energetic, upbeat, friendly",
      "Motivierend — Fitness-Coach, Morning-Show, junger Protagonist mit Drive.",
    ),
    p(
      "Sachlich, klar",
      "clear, matter-of-fact, professional",
      "Kein Drama — Anleitung, Business-Video, Prozess-Erklärer.",
    ),
    p(
      "Verspielt, leicht",
      "playful, light, curious",
      "Humor und Neugier — Animation, Kinderbuch (nicht albern), Quirky-Comedy.",
    ),
  ],
  pitch: [
    p(
      "Tief",
      "Low pitch",
      "Sehr tiefe Lage — Trailer-Bösewicht, Darth-Vader-Richtung oder Bass-Erzähler.",
    ),
    p(
      "Mittel-tief",
      "Mid-low pitch",
      "Warm und männlich mitteltief — Denzel Washington, ruhiger Action-Held.",
    ),
    p(
      "Mittel",
      "Mid pitch",
      "Alltagstauglich neutral — Standard-Protagonist in Drama oder Werbung.",
    ),
    p(
      "Mittel-hoch",
      "Mid-high pitch",
      "Etwas heller — junge Erwachsene, nervöser Charakter, leichte Spannung.",
    ),
    p(
      "Hoch",
      "High pitch",
      "Helle Stimme — Teen, aufgeregter Sidekick oder Comedy.",
    ),
  ],
  resonance: [
    p(
      "Brustresonanz, warm",
      "Warm chest resonance",
      "Volle Bruststimme — ruhiger Autoritäts-Ton, Podcast-Host mit Tiefe.",
    ),
    p(
      "Nasal, hell",
      "Bright nasal resonance",
      "Schriller, nach vorne — nervöser Nebencharakter oder Cartoon-Edge.",
    ),
    p(
      "Rund, voll",
      "Round full resonance",
      "Weich und rund — Romantik, Wellness-App, sanfter Erzähler.",
    ),
    p(
      "Kopfstimme, leicht",
      "Light head voice resonance",
      "Leicht und luftig — junge Frau, ängstliche Szene oder Märchenfee.",
    ),
  ],
  weight: [
    p(
      "Leicht",
      "Light vocal weight",
      "Zart — junge Figur, flüsternde Szene oder introvertierter Charakter.",
    ),
    p(
      "Mittel",
      "Medium vocal weight",
      "Normal besetzt — Standard-Dialog in Serie oder Film.",
    ),
    p(
      "Voll, kräftig",
      "Full-bodied vocal weight",
      "Präsent ohne brüllen — Held in Action, überzeugender Anwalt.",
    ),
    p(
      "Schwer, wuchtig",
      "Heavy substantial vocal weight",
      "Massive Stimme — Kriegsfilm-Kommandant, epischer Fantasy-König.",
    ),
  ],
  timbre: [
    p(
      "Warm, mellow",
      "Warm mellow timbre",
      "Samtig warm — Liebesgeschichte, ruhiger Vater, Audiobook-Romance.",
    ),
    p(
      "Klar, hell",
      "Clear bright timbre",
      "Frisch und deutlich — Nachrichten, Erklärvideo, junge Protagonistin.",
    ),
    p(
      "Rauchig, gravelly",
      "Slightly gravelly timbre",
      "Leicht rauchig — harter Detective, Western, „Whiskey-Stimme“.",
    ),
    p(
      "Weich, freundlich",
      "Soft friendly timbre",
      "Sympathisch weich — Nachbar, Support-Chat, Kinder-Content.",
    ),
  ],
  texture: [
    p(
      "Glatt",
      "Smooth vocal texture",
      "Keine Rauheit — saubere Werbung, UI, Meditation.",
    ),
    p(
      "Leicht rau",
      "Slightly rough texture",
      "Etwas Körnung — Straßen-Interview, Kämpfer nach dem Kampf.",
    ),
    p(
      "Luftig",
      "Airy light texture",
      "Leicht und transparent — Traumsequenz, POV innerer Monolog.",
    ),
    p(
      "Samtig",
      "Velvety smooth texture",
      "Luxuriös weich — Parfum-Werbung, High-End-Narration.",
    ),
  ],
  breath: [
    p(
      "Kaum hörbar",
      "Minimal audible breath",
      "Sehr kontrolliert — Nachrichten, präzise Synchron, keine Atemgeräusche.",
    ),
    p(
      "Sanft, natürlich",
      "Gentle natural breath",
      "Menschlich normal — Filmdialog, Podcast, nicht steril.",
    ),
    p(
      "Intim, nah",
      "Intimate close breath texture",
      "Atem hörbar — Flüstern, Liebesszene, Thriller-Spannung nah am Mic.",
    ),
  ],
  articulation: [
    p(
      "Klar, deutlich",
      "Clear precise articulation",
      "Jedes Wort verständlich — Tutorial, Rechtstext, Kinderhörbuch.",
    ),
    p(
      "Natürlich, locker",
      "Natural relaxed articulation",
      "Wie echtes Gespräch — Sitcom, Impro-Dialog, Freunde unter sich.",
    ),
    p(
      "Langsam, bedächtig",
      "Slow deliberate articulation",
      "Gewicht auf jedem Wort — Gerichtssaal, epischer Fantasy-Erzähler.",
    ),
    p(
      "Schnell, wendig",
      "Quick agile articulation",
      "Wortgewandt schnell — Schlagfertige Comedy, Hustler, Wall-Street-Pitch.",
    ),
  ],
  pace: [
    p(
      "Langsam",
      "Slow deliberate pacing",
      "Sehr bedacht — Trauer, Weisheit, Spannung vor dem Twist.",
    ),
    p(
      "Gemächlich",
      "Leisurely unhurried pacing",
      "Entspannt erzählend — Sonntagskrimi, Reise-Doku, Feierabend-Podcast.",
    ),
    p(
      "Konversationell",
      "Natural conversational pacing",
      "Normales Tempo — Netflix-Drama-Dialog, Interview zu zweit.",
    ),
    p(
      "Zügig",
      "Brisk energetic pacing",
      "Vorwärtsdrang — Action-Recap, Trailer-Montage, aufgeregter Zeuge.",
    ),
  ],
  rhythm: [
    p(
      "Gleichmäßig",
      "Even steady rhythm",
      "Stabil wie Metronom — Anleitung, Meditation, sachliche Doku.",
    ),
    p(
      "Erzählerisch",
      "Measured storytelling rhythm",
      "Hörbuch-Flow — Kapitelwechsel, Fantasy-Saga, True-Crime-Build-up.",
    ),
    p(
      "Locker, dialogisch",
      "Easy conversational rhythm",
      "Alltagston — Buddy-Cop-Banter, Rom-Com, Küchengespräch.",
    ),
    p(
      "Dynamisch",
      "Dynamic varied rhythm",
      "Wechselnd betont — Theater, Charakter mit Temperament, Monolog.",
    ),
  ],
  pauses: [
    p(
      "Wenige Pausen",
      "Few short pauses",
      "Flüssig durch — Werbe-15-Sekunden, Eilmeldung, Hype-Trailer.",
    ),
    p(
      "Natürliche Pausen",
      "Natural conversational pauses",
      "Normale Gesprächspausen — Serie, Podcast, nicht robotisch.",
    ),
    p(
      "Nachdenklich",
      "Thoughtful pauses between phrases",
      "Innehalten zum Nachdenken — Philosophie, Charakter erinnert sich.",
    ),
    p(
      "Dramatisch",
      "Dramatic intentional pauses",
      "Pausen für Effekt — Thriller-Reveal, Bösewicht-Monolog, Cliffhanger.",
    ),
  ],
  intonation: [
    p(
      "Weich, fallend",
      "Soft downward intonation",
      "Sätze klingen beruhigend aus — Abschluss, Trost, sanfter Erzähler.",
    ),
    p(
      "Neutral",
      "Neutral even intonation",
      "Wenig Melodie — Sachinfo, trockener Humor, Roboter-nahe Klarheit.",
    ),
    p(
      "Lebendig, variierend",
      "Lively varied intonation",
      "Expressiv melodisch — Animation, lebhafte Erklärung, Charaktercomedy.",
    ),
    p(
      "Fragenbetont",
      "Gentle rises on questions",
      "Fragen klingen fragend — Interview, Detektiv verhört, Tutorial mit Rückfragen.",
    ),
  ],
  emphasis: [
    p(
      "Dezent",
      "Subtle word emphasis",
      "Kaum Betonung — subtiler Innenmonolog, ASMR-Nähe.",
    ),
    p(
      "Natürlich",
      "Natural light emphasis",
      "Normale Betonung im Dialog — Alltagsszene.",
    ),
    p(
      "Ausdrucksstark",
      "Expressive deliberate emphasis",
      "Wichtige Wörter klar — Motivationsrede, Shakespeare, Courtroom-Drama.",
    ),
  ],
  energy: [
    p(
      "Niedrig, ruhig",
      "Low steady energy",
      "Gelassen, fast müde — Noir-Erzähler, späte Nacht, Trauma-Flashback.",
    ),
    p(
      "Moderat",
      "Moderate inviting energy",
      "Ausgewogen präsent — Standard-Held, sympathischer Coach.",
    ),
    p(
      "Hoch, lebendig",
      "High lively energy",
      "Voller Drive — Sport-Trailer, Kinder-Show, aufgeregter Fan.",
    ),
  ],
  proximity: [
    p(
      "Nah am Mikro",
      "Close-mic intimate proximity",
      "Flüstern-Abstand — Geheimnis, ASMR, Bedtime-Story.",
    ),
    p(
      "Mittel",
      "Medium conversational proximity",
      "Normale Gesprächsdistanz — Wohnzimmer-Szene, Podcast zu zweit.",
    ),
    p(
      "Weiter weg",
      "Slightly distant room proximity",
      "Leichter Raumhall — Rede auf Bühne, Durchsage, Echo in Halle.",
    ),
  ],
  avoid: [
    p(
      "Keine Werbestimme",
      "No announcer voice",
      "Nicht wie TV-Spot — verhindert „Jetzt neu!“-Klang bei Drama.",
    ),
    p(
      "Keine Übertreibung",
      "No exaggerated enthusiasm",
      "Nicht übertrieben euphorisch — kein Infomercial-Verkäufer.",
    ),
    p(
      "Nicht zu theatralisch",
      "No theatrical overacting",
      "Nicht Bühne übertrieben — für Film/Serie statt Oper.",
    ),
    p(
      "Nicht monoton",
      "No monotone delivery",
      "Nicht roboterhaft flach — mehr Leben im Dialog.",
    ),
    p(
      "Nicht zu schnell",
      "No rushed speech",
      "Nicht hetzen — Hörer soll alles verstehen, kein Disclaimer-Tempo.",
    ),
  ],
};
