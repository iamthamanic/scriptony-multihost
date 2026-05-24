/**
 * Audio Timeline Types
 * Timeline shape for audio/book projects (no shots, with audio tracks).
 */

import type {
  Act,
  Sequence,
  Scene,
  AudioTrack,
  AudioClip,
  CharacterVoiceAssignment,
} from "./index";

export interface AudioTimelineData {
  acts: Act[];
  sequences: Sequence[];
  scenes: Scene[];
  /** Audio tracks keyed by sceneId for fast lookup. */
  tracksByScene: Record<string, AudioTrack[]>;
  /** Audio clips keyed by sceneId for fast lookup. */
  clipsByScene: Record<string, AudioClip[]>;
  /** Voice assignments keyed by characterId. */
  voiceAssignments: Record<string, CharacterVoiceAssignment>;
}
