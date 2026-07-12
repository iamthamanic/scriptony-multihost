Multi-Voice-Engine
PRD: Multi-Voice-Engine
KI-Hörspiel- und Film-Audio-Engine für mehrstimmige Szenen, Charakterstimmen, Voice Script Enhance, Voice Cloning, Voice Tuning, Performance Reference, Sounddesign und Audio Assembly
1. Kurzdefinition
Die Multi-Voice-Engine ist ein modularer Audio-Production-Layer für KI-generierte Hörspiele und später filmische Audio-/Dialogproduktion.
Sie ist kein einzelnes TTS-Modell und kein Wrapper um eine konkrete API. Sie ist eine eigenständige Orchestrierungs-Schicht über mehreren Audio-, Voice-, Script- und Rendering-Modulen.
Der Hauptzweck ist:
Drehbuch / Szene / Dialog
→ Charaktere erkennen oder anlegen
→ Stimmen erzeugen, klonen oder zuweisen
→ Voice Script enhancen
→ Regieanweisungen pro Zeile setzen
→ mehrere Takes rendern
→ beste Takes auswählen
→ Soundeffekte, Atmosphäre und Musik setzen
→ Szene mischen
→ fertiges Hörspiel-/Film-Audio exportieren
Realtime, Telefonie und Voice-Agent-Use-Cases sind nicht Ziel des MVP.
2. Produktziel
Die Multi-Voice-Engine soll es ermöglichen, aus Texten, Drehbüchern oder Szenen strukturierte, mehrstimmige Audio-Produktionen zu erzeugen.
Primärer Fokus:
1. Hörspiele
2. Dialogszenen
3. Erzählerstimmen
4. Charakter-Casting
5. Sounddesign
6. filmische Audio-Szenen
7. später Film-/ADR-/Dubbing-Workflows
Nicht primärer Fokus:
1. Realtime Voice Agents
2. Telefonbots
3. Live Streaming TTS
4. SIP / Twilio / Callcenter
5. interruptible low-latency conversations
3. Grundprinzipien
3.1 KISS
Die erste Version darf nicht versuchen, ElevenLabs komplett nachzubauen.
MVP-Kern:
Projekt
→ Szene
→ Charakter
→ Dialogzeile
→ Stimme
→ Regieanweisung
→ Take
→ Szenenmix
Nicht sofort bauen:
- vollständige DAW
- Realtime
- Lip-Sync
- komplexes Dubbing
- Music Generation
- Marketplace
- Agenten
- zehn verschiedene TTS-Engines gleichzeitig
3.2 SOLID
Die Multi-Voice-Engine muss in klar getrennte Module aufgeteilt werden.
Wichtigste Regel:
Script-Logik darf keine TTS-Engine kennen.
Voice-Verwaltung darf keine UI kennen.
Rendering darf keine Projektlogik verändern.
Adapter dürfen keine Business-Entscheidungen treffen.
Empfohlene Verantwortungen:
Script Module:
Validiert und verwaltet Szenen, Charaktere, Lines, Directions.

Voice Module:
Verwaltet Stimmen, Voice Profiles, Clones, Tunings, Consent.

Enhance Module:
Wandelt Rohtext oder Drehbuch in strukturierte Szenen/Lines/Directions um.

Render Module:
Erstellt Jobs, rendert Lines, erzeugt Takes.

Adapter Module:
Spricht konkrete externe oder lokale Engines an.

Audio Module:
Schneidet, normalisiert, mischt, exportiert.

Safety Module:
Prüft Consent, Missbrauch, verbotene Stimmnutzung.
3.3 DRY
Keine doppelte Logik für Stimmen, Scripts, Jobs oder Audio-Dateien.
Ein zentraler Datentyp pro Domäne:
Character
VoiceProfile
Scene
Line
Take
AudioJob
AudioAsset
PerformanceReference
Keine zweite parallele Script-Struktur für UI, Backend und Worker.
UI darf eine View-Struktur haben, aber der gespeicherte Zustand muss aus dem zentralen Schema ableitbar sein.
4. Architekturziel
Die Multi-Voice-Engine soll als eigenständiger Projektbereich oder Modul in die bestehende Codebase integriert werden.
Empfohlene Struktur:
/src
  /lib
    /multi-voice-engine
      /schema
      /script
      /enhance
      /characters
      /voices
      /casting
      /performance-reference
      /render
      /audio
      /adapters
      /safety
      /storage
      /jobs
Muss im Projekt auf Vorhandensein geprüft werden:
- bestehende Projektstruktur
- bestehendes Auth-System
- bestehende User-/Workspace-Struktur
- bestehende Storage-Abstraktion
- bestehende Job-/Queue-Struktur
- bestehende Edge Functions oder API Routes
- bestehende AI-/LLM-Abstraktion
- bestehende DB-Migration-Struktur
- bestehende Audio-/File-Upload-Komponenten
- bestehende UI-Komponentenbibliothek
- bestehende Editor-Komponenten
5. Zielnutzer
Primäre Nutzer:
- Creator für Hörspiele
- Autoren
- Indie-Filmemacher
- Game-/Story-Entwickler
- Marketing-/Content-Teams
- interne Produktionsteams
Sekundäre Nutzer:
- Entwickler, die Audio-Szenen programmatisch erzeugen wollen
- Projektteams, die Voice Libraries verwalten
- Sprecher-/Voice-Teams mit lizenzierten Stimmen
6. Haupt-Use-Cases
6.1 Hörspiel aus Drehbuch erstellen
User gibt ein Skript ein:
MARA: Hast du das auch gehört?
JONAS: Was?
MARA: Da war jemand.
System erkennt:
- Sprecher
- Dialogzeilen
- mögliche Szene
- Stimmung
- Pausen
- Emotion
- Charaktervorschläge
Danach kann User Stimmen zuweisen und Takes rendern.
6.2 Charakterstimme erzeugen
User beschreibt eine Figur:
Eine ruhige, weiblich klingende deutsche Ermittlerin, Mitte 30, kontrolliert, angespannt, analytisch.
System erzeugt oder wählt eine passende Stimme.
MVP-Strategie:
Beschreibung
→ Voice Attributes extrahieren
→ passende Basisstimme suchen
→ Tuning Preset anwenden
→ VoiceProfile speichern
Später:
Beschreibung
→ echte Prompt-to-Voice-Engine
→ Voice Preview
→ ausgewählte Stimme speichern
Muss im Projekt auf Vorhandensein geprüft werden:
- existiert bereits eine Voice Library?
- existieren Default Voices?
- gibt es bereits Preset- oder Template-Strukturen?
- gibt es bereits LLM-Funktionen zur Attribut-Extraktion?
6.3 Stimme klonen
User lädt Referenz-Audio hoch.
System:
1. prüft Datei
2. prüft Consent
3. bereinigt Audio
4. erzeugt Voice Profile
5. speichert Referenz/Embedding
6. generiert Test-Take
MVP:
- Upload
- Consent Checkbox
- Audio-Validierung
- Voice Profile speichern
- Clone-Adapter optional später
Muss im Projekt auf Vorhandensein geprüft werden:
- Upload-System
- private Storage Buckets
- signed URLs
- Consent-/Audit-Logging
- File Hashing
- Background Jobs
6.4 Geklonte Stimme tunen
User sagt:
Mach diese Stimme etwas tiefer, ruhiger und seriöser.
System speichert eine abgeleitete Stimme:
baseVoiceId = voice_abc
newVoiceId = voice_abc_serious_001
type = tuned
MVP-Tuning ist non-destructive:
Original bleibt unverändert.
Tuning wird als Preset/Derived Voice gespeichert.
Nicht sofort versuchen, echte Embedding-Morphs zu bauen.
Muss im Projekt auf Vorhandensein geprüft werden:
- Versionierung für Voices
- Derived-Entity-Pattern
- relationale Verknüpfung baseVoiceId → tunedVoiceId
6.5 Performance Reference
User spricht eine Zeile selbst ein oder lädt Audio hoch.
Ziel:
Die Zielstimme soll denselben Text oder ähnlichen Text mit ähnlicher Betonung, Pausenstruktur und Energie sprechen.
Unterscheidung:
Voice Identity = wer spricht?
Performance = wie wird gesprochen?
System analysiert:
- Timing
- Pausen
- Lautstärkeverlauf
- Betonungswörter
- Emotion
- Tempo
MVP-Fallback:
Referenz-Audio
→ STT/Alignment
→ Pausen/Betonung ableiten
→ Line Direction aktualisieren
→ normales TTS rendern
Später:
Referenz-Audio direkt an Engine mit Performance-Reference-Fähigkeit geben.
Muss im Projekt auf Vorhandensein geprüft werden:
- Audio Upload
- Transkription
- Whisper/WhisperX Worker
- Alignment-Datenmodell
- PerformanceReference-Tabelle
6.6 Voice Script Enhance wie ElevenLabs
User gibt Rohtext oder Drehbuch ein.
System erzeugt strukturierte Szenen, Charaktere, Lines und Directions.
Enhance macht:
- Sprecher erkennen
- Erzähler erkennen
- Szenen erkennen
- Regieanweisungen erkennen
- Dialoge segmentieren
- Pausen setzen
- Emotionen vorschlagen
- Pace setzen
- Sounddesign-Vorschläge machen
- Fremdwörter / Zahlen / URLs sprechbar machen
Enhance darf nicht:
- Fakten erfinden
- Handlung verändern
- Namen verändern
- Zahlen verändern
- Sinn verfälschen
- zu starke Emotionen hinzufügen, wenn nicht begründet
Muss im Projekt auf Vorhandensein geprüft werden:
- zentrale LLM-Abstraktion
- JSON Schema Output Validation
- Prompt-Versionierung
- AI Error Handling
- Rate Limits / Usage Tracking
6.7 Takes pro Zeile erzeugen
Für Hörspiele ist ein einzelnes Audio pro Zeile zu wenig.
User braucht Varianten:
Take 1: neutral
Take 2: ängstlicher
Take 3: leiser
Take 4: mehr Druck
Take 5: langsamer
System speichert alle Takes und markiert einen als selected.
Muss im Projekt auf Vorhandensein geprüft werden:
- Audio Assets
- Take-Auswahl im UI
- Storage für mehrere Varianten
- Invalidation bei Script-Änderung
6.8 Sounddesign und Atmosphäre
Hörspiel braucht Layer:
- Dialog
- Erzähler
- Soundeffekte
- Atmosphäre
- Musik
MVP:
- SFX Cues als Platzhalter im Script
- Ambience Cues als Platzhalter im Script
- manuell hochgeladene Audio-Dateien als Layer
- einfache Lautstärke/Fade/Startzeit
Später:
- Text-to-SFX
- Text-to-Music
- automatische Ambience-Vorschläge
Muss im Projekt auf Vorhandensein geprüft werden:
- Audio Timeline UI
- File Upload für SFX/Music
- Audio Track Datenmodell
- ffmpeg/pydub Audio Assembly Worker
7. Nicht-Ziele für MVP
Nicht in MVP 0.1 bis 0.3 bauen:
- Realtime Voice Agents
- Telefonie
- Streaming TTS
- echte DAW mit komplexer Timeline
- Lip-Sync
- Video Editor
- Dubbing kompletter Filme
- Marketplace für Stimmen
- Prompt-to-Music als Kernfeature
- komplette Stimmen-Generierung aus Text ohne Fallback
Diese Features dürfen architektonisch vorbereitet werden, aber nicht die erste Integration blockieren.
8. Domain-Modell
8.1 Project
Ein Projekt ist ein Hörspiel, Film-Audio-Projekt oder Szenenpaket.
type MultiVoiceProject = {
  id: string;
  userId: string;
  workspaceId?: string;
  title: string;
  projectType: "audio_drama" | "film_audio" | "voiceover" | "test_scene";
  language: string;
  status: "draft" | "active" | "archived";
  createdAt: string;
  updatedAt: string;
};
Muss im Projekt auf Vorhandensein geprüft werden:
- gibt es bereits project_id?
- gibt es workspace_id?
- sind Projekte global oder userbezogen?
- existiert bereits ein generisches Project-Modell?
8.2 Scene
Eine Szene ist die wichtigste Produktionseinheit.
type Scene = {
  id: string;
  projectId: string;
  orderIndex: number;
  title: string;
  location?: string;
  timeOfDay?: string;
  mood?: string;
  description?: string;
  status: "draft" | "ready" | "rendered";
  createdAt: string;
  updatedAt: string;
};
8.3 Character
Ein Charakter ist eine Rolle im Projekt.
type Character = {
  id: string;
  projectId: string;
  name: string;
  roleType: "character" | "narrator" | "extra" | "system";
  description?: string;
  voiceId?: string;
  defaultDirection?: LineDirection;
  createdAt: string;
  updatedAt: string;
};
Regel:
Ein Character darf keine Audio-Dateien direkt besitzen.
Ein Character verweist nur auf VoiceProfile.
8.4 VoiceProfile
Eine Stimme ist unabhängig vom Charakter.
type VoiceProfile = {
  id: string;
  userId: string;
  workspaceId?: string;
  name: string;
  language: string;
  engine: string;
  type:
    | "default"
    | "generated"
    | "cloned"
    | "tuned"
    | "licensed"
    | "uploaded"
    | "external_api";
  status: "draft" | "processing" | "ready" | "failed" | "blocked" | "archived";
  baseVoiceId?: string;
  referenceAudioUrl?: string;
  embeddingUrl?: string;
  description?: string;
  attributes?: VoiceAttributes;
  defaultSettings?: VoiceRenderSettings;
  consentStatus: "not_required" | "pending" | "verified" | "rejected" | "blocked";
  commercialUseAllowed: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
};
8.5 VoiceAttributes
type VoiceAttributes = {
  genderPresentation?: "male" | "female" | "androgynous" | "unknown";
  ageImpression?: "child" | "young_adult" | "adult" | "middle_aged" | "elderly";
  pitch?: "very_low" | "low" | "medium" | "high" | "very_high";
  texture?: "clean" | "rough" | "breathy" | "nasal" | "warm" | "cold";
  pace?: "x_slow" | "slow" | "medium" | "fast" | "x_fast";
  energy?: "very_low" | "low" | "medium" | "high" | "very_high";
  accent?: string;
  style?: string;
};
8.6 Line
Eine Line ist eine einzelne sprechbare Einheit.
type Line = {
  id: string;
  sceneId: string;
  orderIndex: number;
  type: "dialogue" | "narration" | "sfx" | "music" | "ambience" | "pause";
  characterId?: string;
  text?: string;
  direction?: LineDirection;
  selectedTakeId?: string;
  status: "draft" | "dirty" | "ready" | "rendered" | "failed";
  createdAt: string;
  updatedAt: string;
};
8.7 LineDirection
type LineDirection = {
  emotion?:
    | "neutral"
    | "warm"
    | "friendly"
    | "confident"
    | "calm"
    | "serious"
    | "tense"
    | "fearful"
    | "sad"
    | "angry"
    | "excited"
    | "dramatic"
    | "whispered"
    | "controlled"
    | "panic";

  pace?: "x_slow" | "slow" | "medium" | "fast" | "x_fast";
  volume?: "whisper" | "quiet" | "medium" | "loud";
  energy?: "very_low" | "low" | "medium" | "high" | "very_high";
  emphasis?: "none" | "light" | "medium" | "strong";
  pauseBeforeMs?: number;
  pauseAfterMs?: number;
  directorNote?: string;
  pronunciationHints?: PronunciationHint[];
  performanceReferenceId?: string;
};
8.8 Take
type Take = {
  id: string;
  lineId: string;
  jobId: string;
  takeIndex: number;
  audioUrl: string;
  durationMs?: number;
  renderSettings?: VoiceRenderSettings;
  directionSnapshot?: LineDirection;
  isSelected: boolean;
  status: "processing" | "ready" | "failed";
  createdAt: string;
};
8.9 AudioAsset
type AudioAsset = {
  id: string;
  userId: string;
  workspaceId?: string;
  projectId?: string;
  sourceType:
    | "take"
    | "uploaded_sfx"
    | "generated_sfx"
    | "uploaded_music"
    | "generated_music"
    | "ambience"
    | "final_scene_mix"
    | "final_project_mix"
    | "reference_audio";
  url: string;
  format: "wav" | "mp3" | "ogg" | "flac";
  durationMs?: number;
  sizeBytes?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
};
8.10 PerformanceReference
type PerformanceReference = {
  id: string;
  userId: string;
  projectId?: string;
  lineId?: string;
  audioUrl: string;
  transcript?: string;
  language: string;
  mode: "timing" | "prosody" | "emotion" | "full_performance";
  strength: number;
  analysis?: {
    durationMs?: number;
    pace?: string;
    emotion?: string;
    emphasisWords?: string[];
    pauseMap?: Array<{
      position: string;
      pauseMs: number;
    }>;
    wordTimings?: Array<{
      word: string;
      startMs: number;
      endMs: number;
    }>;
  };
  status: "processing" | "ready" | "failed";
  createdAt: string;
};
9. Multi-Voice Script Format
Das zentrale JSON-Format für Export, Speicherung und Worker-Snapshots.
type MultiVoiceScript = {
  version: "1.0";
  projectId: string;
  projectType: "audio_drama" | "film_audio" | "voiceover" | "test_scene";
  language: string;
  characters: Character[];
  voices: VoiceProfile[];
  scenes: MultiVoiceScene[];
  globalSettings: {
    outputFormat: "wav" | "mp3";
    sampleRate: 44100 | 48000;
    loudnessTarget: "-16 LUFS" | "-18 LUFS" | "-23 LUFS";
    normalize: boolean;
    trimSilence: boolean;
  };
};
Scene im Script:
type MultiVoiceScene = {
  id: string;
  title: string;
  orderIndex: number;
  location?: string;
  mood?: string;
  lines: MultiVoiceLine[];
  ambienceCues?: AmbienceCue[];
  musicCues?: MusicCue[];
  sfxCues?: SfxCue[];
};
Line im Script:
type MultiVoiceLine = {
  id: string;
  orderIndex: number;
  type: "dialogue" | "narration" | "pause";
  characterId?: string;
  voiceId?: string;
  text?: string;
  direction?: LineDirection;
  renderSettings?: {
    takeCount: number;
    variationStrength: number;
    seed?: number;
    engine?: string;
  };
};
10. Database PRD
10.1 Tabellen, die wahrscheinlich benötigt werden
multi_voice_projects
multi_voice_scenes
multi_voice_characters
multi_voice_lines
multi_voice_voices
multi_voice_takes
multi_voice_audio_assets
multi_voice_audio_jobs
multi_voice_performance_references
multi_voice_pronunciation_dictionary
multi_voice_sfx_cues
multi_voice_music_cues
multi_voice_ambience_cues
Muss im Projekt auf Vorhandensein geprüft werden:
- existieren bereits projects?
- existieren bereits files/audio_assets?
- existieren bereits jobs?
- existieren bereits user/workspace/organization Tabellen?
- existieren bereits audit_logs?
Wenn vorhandene generische Tabellen existieren, nicht doppelt bauen. Dann nur Multi-Voice-spezifische Tabellen ergänzen.
10.2 Minimaler MVP-DB-Satz
Für MVP nicht alle Tabellen bauen. Minimal:
1. projects oder bestehende project table verwenden
2. multi_voice_scenes
3. multi_voice_characters
4. multi_voice_lines
5. multi_voice_voices
6. multi_voice_takes
7. multi_voice_audio_jobs
8. multi_voice_audio_assets
Später:
9. performance_references
10. pronunciation_dictionary
11. sfx_cues
12. music_cues
13. ambience_cues
14. voice_generation_requests
15. voice_clone_requests
16. voice_tuning_requests
11. API PRD
11.1 Project APIs
POST /api/multi-voice/projects
GET /api/multi-voice/projects
GET /api/multi-voice/projects/:projectId
PATCH /api/multi-voice/projects/:projectId
DELETE /api/multi-voice/projects/:projectId
Muss im Projekt auf Vorhandensein geprüft werden:
- gibt es bereits Projekt-APIs?
- falls ja: Multi-Voice als projectType integrieren statt eigene Projekt-API bauen
11.2 Scene APIs
POST /api/multi-voice/projects/:projectId/scenes
GET /api/multi-voice/projects/:projectId/scenes
PATCH /api/multi-voice/scenes/:sceneId
DELETE /api/multi-voice/scenes/:sceneId
POST /api/multi-voice/scenes/:sceneId/reorder
11.3 Character APIs
POST /api/multi-voice/projects/:projectId/characters
GET /api/multi-voice/projects/:projectId/characters
PATCH /api/multi-voice/characters/:characterId
DELETE /api/multi-voice/characters/:characterId
POST /api/multi-voice/characters/:characterId/assign-voice
11.4 Line APIs
POST /api/multi-voice/scenes/:sceneId/lines
GET /api/multi-voice/scenes/:sceneId/lines
PATCH /api/multi-voice/lines/:lineId
DELETE /api/multi-voice/lines/:lineId
POST /api/multi-voice/scenes/:sceneId/lines/reorder
POST /api/multi-voice/lines/:lineId/split
POST /api/multi-voice/lines/:lineId/merge
11.5 Enhance APIs
POST /api/multi-voice/enhance/script
POST /api/multi-voice/enhance/scene
POST /api/multi-voice/enhance/line
POST /api/multi-voice/enhance/casting
POST /api/multi-voice/enhance/sounddesign
KISS-MVP:
POST /api/multi-voice/enhance/script
Alle anderen Enhance-Endpunkte später auslagern, wenn nötig.
11.6 Voice APIs
GET /api/multi-voice/voices
POST /api/multi-voice/voices/generate
POST /api/multi-voice/voices/clone
POST /api/multi-voice/voices/tune
GET /api/multi-voice/voices/:voiceId
PATCH /api/multi-voice/voices/:voiceId
DELETE /api/multi-voice/voices/:voiceId
MVP:
GET /api/multi-voice/voices
POST /api/multi-voice/voices
PATCH /api/multi-voice/voices/:voiceId
Voice Generation / Clone / Tune können zuerst als request records vorbereitet werden.
11.7 Rendering APIs
POST /api/multi-voice/render/line
POST /api/multi-voice/render/scene
POST /api/multi-voice/render/project
GET /api/multi-voice/render/jobs/:jobId
POST /api/multi-voice/render/jobs/:jobId/cancel
POST /api/multi-voice/takes/:takeId/select
KISS-MVP:
POST /api/multi-voice/render/line
POST /api/multi-voice/render/scene
GET /api/multi-voice/render/jobs/:jobId
POST /api/multi-voice/takes/:takeId/select
12. Module PRD
12.1 Script Module
Verantwortung:
- Szenenstruktur
- Lines
- Characters
- Directions
- Validierung
- Reorder
- Dirty-State
- Snapshot-Erstellung für Render Jobs
Darf nicht:
- Audio rendern
- TTS Engine aufrufen
- Dateien speichern
- externe APIs direkt nutzen
12.2 Enhance Module
Verantwortung:
- Rohtext → strukturierte Szenen
- Sprecher erkennen
- Charaktervorschläge erzeugen
- Directions vorschlagen
- Pausen setzen
- Regieanweisungen normalisieren
- Sounddesign-Vorschläge erzeugen
Muss JSON-Schema-validierten Output liefern.
Muss im Projekt auf Vorhandensein geprüft werden:
- existiert ein AI client?
- existiert OpenAI/Anthropic/LLM wrapper?
- existiert structured output validation?
- existieren prompt templates?
12.3 Voice Module
Verantwortung:
- VoiceProfile CRUD
- Voice-Zuweisung zu Charakteren
- Voice Generation Requests
- Voice Clone Requests
- Voice Tuning Requests
- Consent-Status
- Voice-Versionierung
Darf nicht:
- Szenen rendern
- Audio mischen
- UI-State speichern
12.4 Casting Module
Verantwortung:
- Charakterbeschreibung → passende Voice Attributes
- Voice Library Matching
- Warnung bei zu ähnlichen Stimmen
- Vorschläge für Voice Diversity
MVP:
- simple rules
- attribute matching
- no ML required
12.5 Performance Reference Module
Verantwortung:
- Referenz-Audio speichern
- Transkription anstoßen
- Word timings / Alignment speichern
- Betonung/Pausen ableiten
- LineDirection aktualisieren
Muss im Projekt auf Vorhandensein geprüft werden:
- STT Worker
- Audio upload
- background jobs
- storage
12.6 Render Module
Verantwortung:
- Render Jobs erstellen
- Script Snapshot erzeugen
- passende Engine wählen
- Takes erzeugen
- Status aktualisieren
- Retry / Fehlerstatus setzen
Darf nicht:
- Live-Daten aus Script während laufendem Job mutieren
Regel:
Jeder Render Job nutzt einen Snapshot.
Wenn User danach Line ändert, wird der alte Job nicht verändert.
12.7 Adapter Module
Verantwortung:
- konkrete Engine aufrufen
- Payload mappen
- Response normalisieren
- technische Fehler melden
Adapter Interface:
export type RenderLineInput = {
  lineId: string;
  text: string;
  language: string;
  voice: VoiceProfile;
  direction: LineDirection;
  takeIndex: number;
  renderSettings: {
    variationStrength: number;
    seed?: number;
  };
};

export type RenderLineOutput = {
  audioUrl: string;
  durationMs?: number;
  warnings?: string[];
};

export interface VoiceEngineAdapter {
  engineName: string;

  capabilities: {
    supportsTextToSpeech: boolean;
    supportsVoiceCloning: boolean;
    supportsVoiceGenerationFromPrompt: boolean;
    supportsVoiceTuning: boolean;
    supportsPerformanceReference: boolean;
    supportsEmotion: boolean;
    supportsSSML: boolean;
  };

  renderLine(input: RenderLineInput): Promise<RenderLineOutput>;

  generateVoice?(input: GenerateVoiceInput): Promise<VoiceProfile>;
  cloneVoice?(input: CloneVoiceInput): Promise<VoiceProfile>;
  tuneVoice?(input: TuneVoiceInput): Promise<VoiceProfile>;
}
12.8 Audio Module
Verantwortung:
- Silence trim
- Pausen einfügen
- Takes normalisieren
- Szene zusammenbauen
- SFX/Music/Ambience layern
- Lautheit normalisieren
- Export erzeugen
MVP:
- ffmpeg oder pydub
- WAV intern
- MP3 final export
- einfache Lautstärke
- einfache Pausen
Später:
- ducking
- EQ
- compression
- reverb
- stereo panning
- LUFS mastering
12.9 Safety Module
Verantwortung:
- Consent prüfen
- Voice-Nutzung prüfen
- blockierte Voices verhindern
- Abuse-Prüfung für Cloning
- Audit Logs
Muss im Projekt auf Vorhandensein geprüft werden:
- policy checks
- audit logs
- user roles
- workspace permissions
- content moderation
13. UI PRD
13.1 Hauptscreens
1. Multi-Voice Projects
2. Project Editor
3. Scene Editor
4. Character / Casting Panel
5. Voice Library
6. Voice Studio
7. Line Take Review
8. Scene Mix Preview
9. Export Panel
Muss im Projekt auf Vorhandensein geprüft werden:
- Routing-Struktur
- Layout-System
- Modal-System
- Form-Komponenten
- Toast/Error-System
- Audio Player
- File Upload UI
13.2 Scene Editor Layout
Empfohlen:
Links:
Szenenliste

Mitte:
Lines / Drehbuch / Dialoge

Rechts:
Character, Voice, Direction, Takes

Unten:
Audio Preview / Scene Mix
KISS-MVP:
Kein komplexer Timeline-Editor.
Erst Line-basierter Editor mit Scene Preview.
13.3 Line Card
Line Card zeigt:
- Sprecher / Character
- Text
- Voice
- Emotion
- Pace
- Volume
- Pause before/after
- Director Note
- Takes
- Render Button
Aktionen:
- Edit Text
- Change Character
- Change Voice
- Enhance Line
- Render Takes
- Select Take
- Mark Dirty
13.4 Voice Studio
Funktionen:
- Stimme manuell anlegen
- Stimme aus Beschreibung vorbereiten
- Stimme klonen
- Stimme tunen
- Testtext rendern
KISS-MVP:
- VoiceProfile CRUD
- Default Voices
- Voice-Zuweisung zu Character
Clone/Generate/Tune als vorbereitete UI-Abschnitte, aber erst implementieren, wenn Backend bereit ist.
14. Rendering PRD
14.1 Render Line
Input:
{
  "lineId": "line_123",
  "takeCount": 3,
  "variationStrength": 0.35,
  "engine": "auto"
}
Output:
{
  "jobId": "job_123",
  "status": "queued"
}
Worker erzeugt:
take_001.wav
take_002.wav
take_003.wav
14.2 Render Scene
Input:
{
  "sceneId": "scene_123",
  "renderDirtyOnly": true,
  "includeSfx": true,
  "includeMusic": true,
  "outputFormat": "mp3"
}
Ablauf:
1. alle Lines laden
2. prüfen, welche Lines selectedTake haben
3. dirty Lines neu rendern oder blockieren
4. selected Takes zusammensetzen
5. Pausen einfügen
6. SFX/Ambience/Music layern
7. final scene mix speichern
14.3 Render Project
Später.
Nicht im ersten MVP.
15. Dirty-State und Invalidation
Wenn User eine Line ändert:
line.status = dirty
selectedTakeId bleibt optional sichtbar, aber als outdated markiert.
Wenn User nur Pause ändert:
Line-Take muss nicht zwingend neu gerendert werden.
Scene Mix muss neu gebaut werden.
Wenn User Voice ändert:
Alle Takes dieser Line invalidieren.
Neu rendern.
Wenn User Director Note ändert:
Takes invalidieren.
Neu rendern.
Wenn User Scene Ambience ändert:
Voice Takes bleiben gültig.
Scene Mix invalidieren.
16. Edge Cases
16.1 Script ohne Sprecher
Handling:
Als Narration importieren oder Character "Narrator" automatisch anlegen.
16.2 Zwei Charaktere haben gleiche Stimme
Handling:
Erlauben, aber Warnung anzeigen.
Casting Diversity Check.
16.3 Voice gelöscht, aber Character nutzt sie
Handling:
Character.voiceId bleibt gespeichert.
UI zeigt "missing voice".
Rendering blockieren, bis neue Voice gewählt wurde.
16.4 Voice blockiert
Handling:
Neue Render blockieren.
Bestehende Takes als restricted markieren.
16.5 Line ist zu lang
Handling:
Warnung ab 220–350 Zeichen.
Option: automatisch splitten.
16.6 TTS Engine scheitert bei einer Line
Handling:
Retry pro Take.
Danach Take failed.
Line bleibt renderbar.
Scene Render blockiert nur, wenn keine selected/ready Take existiert.
16.7 Szene hat keine ausgewählten Takes
Handling:
Scene Render blockieren.
Fehler: no_selected_takes.
16.8 SFX ist lauter als Dialog
Handling:
MVP: Max Volume Limit für SFX.
Später: Ducking.
16.9 Projekt ist sehr lang
Handling:
Szenenweise rendern.
Nicht gesamtes Projekt bei jeder Änderung neu rendern.
16.10 Performance Reference passt nicht zum Zieltext
Handling:
Nur globale Prosodie übernehmen.
Keine wortgenaue Betonung.
Warnung speichern.
17. Open-Source-Integrationskandidaten
Diese Liste ist keine finale technische Entscheidung. Jede Lizenz, Modelllizenz, kommerzielle Nutzbarkeit, Systemanforderung und Qualität muss vor Integration geprüft werden.
17.1 TTS / Voice Cloning
Kandidaten:
- OpenVoice
- F5-TTS
- CosyVoice
- Chatterbox
- Fish Speech
Muss geprüft werden:
- kommerzielle Nutzbarkeit
- Modelllizenz getrennt von Code-Lizenz
- deutsche Sprache
- GPU-Anforderung
- Qualität bei Hörspiel-Dialog
- Emotion/Style-Control
- Voice Cloning Qualität
- API-fähiger Worker-Betrieb
17.2 STT / Alignment
Kandidaten:
- faster-whisper
- WhisperX
- Montreal Forced Aligner
Muss geprüft werden:
- deutsche Genauigkeit
- Word timestamps
- Forced Alignment
- Batch-Verarbeitung
- GPU/CPU-Performance
17.3 Audio Cleanup
Kandidaten:
- Demucs
- DeepFilterNet
- RNNoise
- Silero VAD
Muss geprüft werden:
- kann Stimme aus Hintergrund trennen?
- kann Rauschen reduzieren?
- ist es stabil als Worker?
- Lizenz
- Laufzeitkosten
17.4 Audio Assembly
Kandidaten:
- ffmpeg
- pydub
- librosa
- soundfile
- pyloudnorm
MVP-Empfehlung:
ffmpeg als robuste Basis.
pydub für einfache Assembly.
pyloudnorm für Loudness später.
17.5 UI Audio Preview
Kandidaten:
- WaveSurfer.js
- Peaks.js
MVP-Empfehlung:
WaveSurfer.js für einfache Waveform und Preview.
Kein kompletter DAW-Editor am Anfang.
18. Worker-Konzept
Rendering und Audio Processing dürfen nicht synchron in normalen API Requests passieren.
Erforderlich:
API
→ audio_job erstellen
→ Worker rendert
→ Status speichern
→ UI pollt oder subscribed
Muss im Projekt auf Vorhandensein geprüft werden:
- gibt es eine Queue?
- Supabase Queue?
- Redis/BullMQ?
- Cron Worker?
- Background Function?
- eigener Python Worker?
- Docker Deployment?
KISS-MVP:
Ein Worker-Prozess für Rendering.
Eine Job-Tabelle.
Polling im Frontend.
Keine komplexe Queue, wenn Projekt noch klein ist.
19. Storage-Konzept
Empfohlene Struktur:
/storage
  /multi-voice
    /{userId}
      /projects
        /{projectId}
          /voices
          /references
          /takes
          /scenes
          /exports
Regeln:
- Voice Reference Audio immer privat.
- Performance References privat.
- Takes privat.
- Scene Exports privat, außer User veröffentlicht sie.
- Zugriff über signed URLs.
Muss im Projekt auf Vorhandensein geprüft werden:
- vorhandene Storage Buckets
- signed URL helper
- private/public file policy
- file cleanup jobs
20. Security / Consent
Pflicht für Voice Cloning und Voice Tuning.
Regeln:
- Cloning nur mit bestätigtem Consent.
- Consent-Text versionieren.
- Upload Hash speichern.
- Voice status kann blocked werden.
- Blocked voices dürfen nicht gerendert werden.
- Referenz-Audio nicht öffentlich ausgeben.
Consent-Record:
type VoiceConsent = {
  id: string;
  voiceId: string;
  userId: string;
  consentTextVersion: string;
  consentConfirmedAt: string;
  sourceAudioHash?: string;
  commercialUseAllowed: boolean;
};
Muss im Projekt auf Vorhandensein geprüft werden:
- Audit Log System
- Consent Storage
- User Terms / Policy Pages
- Rollen/Rechte-System
21. MVP-Roadmap
MVP 0.1: Core Hörspiel Editor
Bauen:
- Project / Scene / Character / Line Datenmodell
- Script Editor
- Character Assignment
- VoiceProfile CRUD
- LineDirection
- Enhance Script Endpoint
- Dirty-State
Nicht bauen:
- Voice Cloning
- echte Prompt Voice Generation
- Performance Reference
- Sounddesign Generation
MVP 0.2: Render Lines und Takes
Bauen:
- AudioJob Tabelle
- Render Line Endpoint
- Adapter Interface
- Dummy Adapter
- ein echter TTS Adapter
- Take Speicherung
- Take Selection
MVP 0.3: Scene Mix
Bauen:
- Render Scene
- selected takes assembly
- Pausen einfügen
- final scene audio
- einfache Preview
MVP 0.4: Voice Studio
Bauen:
- Voice Clone Request
- Consent Flow
- Reference Audio Upload
- Voice Tuning als non-destructive Preset
- Voice Generation aus Beschreibung als Attribute Matching
MVP 0.5: Performance Reference
Bauen:
- Referenz-Audio Upload
- STT/Alignment Worker
- PerformanceReference Analyse
- Direction Update aus Referenz
MVP 0.6: Sounddesign Layer
Bauen:
- SFX Cues
- Ambience Cues
- Music Cues
- Uploaded audio assets
- einfache Scene Assembly mit Layern
22. Acceptance Criteria
22.1 Core Editor
Akzeptiert, wenn:
- User kann Projekt anlegen.
- User kann Szene anlegen.
- User kann Charaktere anlegen.
- User kann Dialogzeilen anlegen.
- User kann Charakter pro Zeile wählen.
- User kann Stimme pro Charakter wählen.
- User kann Emotion/Pace/Pause setzen.
- Änderungen markieren Lines als dirty.
22.2 Enhance
Akzeptiert, wenn:
- Rohtext mit Sprecherlabels wird in Characters und Lines umgewandelt.
- Output ist valide gegen Schema.
- Keine erfundenen Inhalte.
- Scene/Line-Struktur ist editierbar.
22.3 Render Line
Akzeptiert, wenn:
- User kann eine Line rendern.
- System erstellt 1–5 Takes.
- Takes werden gespeichert.
- User kann Take abspielen.
- User kann Take auswählen.
22.4 Render Scene
Akzeptiert, wenn:
- Scene nutzt selected Takes.
- Pausen werden berücksichtigt.
- Finales Audio wird erzeugt.
- Audio ist als Asset gespeichert.
- UI kann Scene Mix abspielen.
22.5 Voice Profile
Akzeptiert, wenn:
- User kann VoiceProfile anlegen.
- Voice kann Character zugewiesen werden.
- Character nutzt Voice beim Rendering.
- Fehlende/blockierte Voice verhindert Rendering.
23. Technische Integrationsprüfung für Coding-KI
Vor Implementierung muss die Coding-KI diese Punkte in der Codebase prüfen:
1. Welche Framework-Struktur existiert?
   - Next.js?
   - React/Vite?
   - Supabase?
   - Express?
   - Edge Functions?

2. Gibt es ein bestehendes Projektmodell?
   - project_id?
   - workspace_id?
   - user_id?

3. Gibt es ein bestehendes Auth-System?
   - Supabase Auth?
   - eigene Users?
   - Rollen/Rechte?

4. Gibt es Storage?
   - Supabase Storage?
   - S3?
   - lokale Files?
   - signed URLs?

5. Gibt es Jobs/Queue?
   - Supabase Queue?
   - cron?
   - Redis/BullMQ?
   - kein System vorhanden?

6. Gibt es eine AI-Abstraktion?
   - OpenAI Client?
   - structured output?
   - Prompt-Versionierung?

7. Gibt es bereits Audio-Komponenten?
   - Audio Player?
   - Upload?
   - Waveform?

8. Gibt es DB-Migrationsstruktur?
   - SQL files?
   - Prisma?
   - Drizzle?
   - Supabase migrations?

9. Gibt es API-Konventionen?
   - REST?
   - RPC?
   - Edge Functions?
   - server actions?

10. Gibt es Error-/Toast-/Logging-Konventionen?
Wenn etwas davon existiert, Multi-Voice-Engine integrieren. Nicht doppelt bauen.
24. Empfohlene Datei-Struktur
/src/lib/multi-voice-engine
  /schema
    project.schema.ts
    scene.schema.ts
    character.schema.ts
    voice.schema.ts
    line.schema.ts
    take.schema.ts
    job.schema.ts
    performance-reference.schema.ts

  /script
    validate-script.ts
    create-script-snapshot.ts
    dirty-state.ts
    line-splitting.ts

  /enhance
    enhance-script.ts
    enhance-scene.ts
    prompts.ts
    parse-enhance-output.ts

  /voices
    create-voice.ts
    assign-voice.ts
    clone-voice-request.ts
    tune-voice.ts
    generate-voice-from-description.ts
    voice-matching.ts
    consent.ts

  /render
    create-render-job.ts
    render-line.ts
    render-scene.ts
    select-take.ts
    render-status.ts

  /adapters
    voice-engine-adapter.ts
    dummy.adapter.ts
    external-tts.adapter.ts
    openvoice.adapter.ts
    f5-tts.adapter.ts

  /audio
    assemble-scene.ts
    insert-silence.ts
    normalize.ts
    export-audio.ts

  /performance-reference
    create-reference.ts
    analyze-reference.ts
    map-reference-to-direction.ts

  /safety
    validate-voice-usage.ts
    validate-consent.ts
    validate-script-safety.ts

  /storage
    audio-paths.ts
    signed-urls.ts
    upload-audio.ts
25. Coding-Regeln
25.1 Keine Engine direkt aus UI aufrufen
Falsch:
UI → OpenVoice
Richtig:
UI → Multi-Voice API → Render Module → Adapter → Engine
25.2 Kein Rendering ohne Snapshot
Falsch:
Worker liest aktuelle Line während Job läuft.
Richtig:
Job enthält scriptSnapshot.
Worker rendert Snapshot.
25.3 Keine direkte Voice-Mutation bei Tuning
Falsch:
Original Voice überschreiben.
Richtig:
Derived Voice erstellen.
baseVoiceId referenzieren.
25.4 Keine doppelte Script-Struktur
Falsch:
FrontendScript
BackendScript
WorkerScript
Richtig:
Ein zentrales MultiVoiceScript Schema.
UI View State wird daraus abgeleitet.
25.5 Adapter klein halten
Adapter darf nur:
- Input mappen
- Engine aufrufen
- Output normalisieren
Adapter darf nicht:
- DB schreiben
- Business Rules prüfen
- Consent entscheiden
- UI Status kennen
26. Größte Risiken
1. Zu großer Scope.
2. Zu früh echte Voice Generation aus Prompt bauen.
3. Zu viele Engines gleichzeitig integrieren.
4. Keine saubere Trennung zwischen Character, Voice und Take.
5. Kein Dirty-State.
6. Kein Snapshot für Render Jobs.
7. Voice Cloning ohne Consent Layer.
8. Scene Mix zu früh als komplette DAW bauen.
9. Audio-Dateien ohne klare Asset-Struktur speichern.
10. Lizenzprüfung bei Open-Source-Modellen vergessen.
27. Harte Priorität
Die richtige Reihenfolge:
1. Datenmodell sauber machen.
2. Editor für Szenen/Charaktere/Lines bauen.
3. VoiceProfile als abstraktes Modell bauen.
4. Enhance zu strukturiertem Script bauen.
5. Render Job + Dummy Adapter bauen.
6. Takes speichern und auswählen.
7. Scene Mix aus selected Takes bauen.
8. Erst dann echte TTS Engine integrieren.
9. Danach Voice Cloning.
10. Danach Performance Reference.
11. Danach Sounddesign.
Nicht andersherum.
28. Finale Kurzfassung für Projekt-/Coding-KI
Die Multi-Voice-Engine ist ein modularer Audio-Drama-Production-Layer für Hörspiele und später Film-Audio. Sie soll in die bestehende Codebase integriert werden, ohne vorhandene Projekt-, Auth-, Storage-, Job-, AI- oder UI-Strukturen doppelt zu bauen. Kernobjekte sind Project, Scene, Character, VoiceProfile, Line, LineDirection, Take, AudioJob, AudioAsset und PerformanceReference. Die Engine trennt strikt Character, Voice Identity, Performance, Script und Audio Output. Rendering läuft über Jobs mit Snapshots und Engine-Adaptern. MVP-Fokus liegt auf Szenen, Charakteren, Dialogzeilen, Voice-Zuweisung, Enhance, Takes und Scene Mix. Voice Cloning, Voice Tuning, Performance Reference und Sounddesign folgen stufenweise. KISS, SOLID und DRY sind verbindlich: kleine Module, klare Verantwortungen, ein zentrales Schema, keine direkte Engine-Kopplung, keine doppelte Logik.
