/**
 * Audio production types (Hörbuch/Hörspiel).
 */

import type { Character } from "./project";

export type AudioTrackType = "dialog" | "narrator" | "music" | "sfx" | "atmo";

export interface AudioTrack {
  id: string;
  sceneId: string;
  projectId: string;
  type: AudioTrackType;
  content?: string; // Text für Dialog/Narrator
  characterId?: string;
  character?: Character; // Expanded

  // Audio Datei — LEGACY: Wird durch AudioClip ersetzt (T28+)
  /** @deprecated Wird durch AudioClip.audioFileId ersetzt. */
  audioFileId?: string;
  audioFileUrl?: string;
  /** @deprecated Wird durch AudioClip.waveformData ersetzt. */
  waveformData?: number[];
  /** @deprecated Wird durch AudioClip.audioDuration ersetzt. */
  audioDuration?: number;

  // Timing in der Szene — LEGACY: Wird durch AudioClip ersetzt (T28+)
  /** @deprecated Wird durch AudioClip.startSec ersetzt. */
  startTime?: number;
  /** @deprecated Wird durch AudioClip.endSec ersetzt. */
  duration?: number;
  fadeIn?: number;
  fadeOut?: number;

  // TTS
  ttsVoiceId?: string;
  ttsSettings?: {
    emotion?: string;
    stability?: number;
    style?: number;
    speed?: number;
  };

  createdAt: string;
  updatedAt: string;
}

// ── AudioClip: Temporale Realisierung eines AudioTracks (Ist-Ebene) ──
export interface AudioClip {
  id: string;
  trackId: string; // FK → AudioTrack
  sceneId: string;
  projectId: string;
  startSec: number;
  endSec: number;
  laneIndex: number;
  orderIndex: number;
  // Denormalisiert für schnelle Timeline-Render (optional, T28+)
  trackType?: string;
  content?: string;
  characterId?: string;
  audioFileId?: string;
  waveformData?: number[];
  crossScene?: boolean;
  fxPresetId?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Gemeinsames Clip-Interface (Audio + Film) ──
export interface BaseClip {
  id: string;
  startSec: number;
  endSec: number;
  laneIndex: number;
}

// ── Lane-Schema: Lane-Index-Zuweisung pro Track-Typ ──
export const LANE_SCHEMA = {
  dialog: { base: 0, max: 9, label: "Dialog", icon: "Mic" },
  sfx: { base: 10, max: 19, label: "SFX", icon: "Volume2" },
  music: { base: 20, max: 29, label: "Musik", icon: "Music" },
  atmo: { base: 30, max: 39, label: "Atmo", icon: "Wind" },
  narrator: { base: 40, max: 49, label: "Erzähler", icon: "BookOpen" },
  global: { base: 90, max: 99, label: "Global", icon: "Globe" },
} as const;

// ── WPM-Schätzungskonfiguration ──
export const WPM_DEFAULTS = {
  base: 150,
  languageModifiers: { de: 1.0, en: 1.07, es: 1.03 },
  emotionModifiers: {
    sachlich: 1.0,
    amüsiert: 1.1,
    aufgeregt: 1.2,
    wütend: 1.25,
    traurig: 0.85,
    ängstlich: 1.15,
    nachdenklich: 0.9,
    begeistert: 1.15,
  },
  typeDefaults: {
    dialog: 150,
    narrator: 140,
    sfx: 0,
    music: 0,
    atmo: 0,
  },
  minDurationSec: 1,
  maxDurationSec: 600,
} as const;

export interface RecordingSession {
  id: string;
  projectId: string;
  sceneId: string;
  title: string;
  description?: string;
  status:
    | "preparing"
    | "ready"
    | "recording"
    | "paused"
    | "completed"
    | "cancelled";
  participants: RecordingParticipant[];

  startedAt?: string;
  endedAt?: string;
  recordingUrl?: string;
  recordingDuration?: number;

  createdAt: string;
  updatedAt: string;
}

export interface RecordingParticipant {
  id: string;
  sessionId: string;
  characterId?: string;
  userId?: string;
  externalSpeakerName?: string;
  externalSpeakerEmail?: string;
  role: "speaker" | "director" | "technician" | "observer";
  joinedAt?: string;
  leftAt?: string;
}

export interface CharacterVoiceAssignment {
  id: string;
  projectId: string;
  characterId: string;
  voiceActorType: "human" | "tts";

  // Für Human Voice Actor
  voiceActorName?: string;
  voiceActorContact?: string;
  voiceActorNotes?: string;

  // Für TTS
  ttsProvider?: "openai" | "elevenlabs" | "google";
  ttsVoiceId?: string;
  ttsVoicePreset?: {
    voice: string;
    model?: string;
    settings?: Record<string, number>;
  };

  // Samples
  sampleAudioUrl?: string;
  sampleText?: string;

  createdAt: string;
  updatedAt: string;
}

export interface ShotAudio {
  id: string;
  shotId: string;
  type: "music" | "sfx";
  fileUrl: string;
  fileName: string;
  label?: string;
  fileSize?: number;
  startTime?: number; // Trim start time in seconds
  endTime?: number; // Trim end time in seconds
  fadeIn?: number; // Fade in duration in seconds
  fadeOut?: number; // Fade out duration in seconds
  waveformData?: number[]; // Cached waveform peaks
  duration?: number; // Audio duration in seconds
  createdAt: string;
}
