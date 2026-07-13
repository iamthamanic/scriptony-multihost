/**
 * Ephemeral voice design preview candidate (Voicebox designed profile + preview audio).
 * Location: src/lib/mve/casting/voice-design-candidate.ts
 */

import type { MveVoiceDesignSpec } from "@/lib/multi-voice-engine/schema/voice-design-spec";

export const VOICE_DESIGN_PREVIEW_COUNT = 3;

export const VOICE_DESIGN_PREVIEW_NAME_PREFIX = "__preview-";

export interface VoiceDesignCandidate {
  /** Session-local id (not Voicebox id). */
  id: string;
  voiceboxProfileId: string;
  index: 0 | 1 | 2;
  label: "A" | "B" | "C";
  previewAudioPath?: string;
}

export interface VoiceDesignPreviewSession {
  sessionId: string;
  designPrompt: string;
  candidates: VoiceDesignCandidate[];
  designSpec?: MveVoiceDesignSpec | null;
}

export function voiceDesignCandidateLabel(
  index: number,
): VoiceDesignCandidate["label"] {
  if (index === 0) return "A";
  if (index === 1) return "B";
  return "C";
}

export function isVoiceDesignPreviewProfileName(name: string): boolean {
  return name.startsWith(VOICE_DESIGN_PREVIEW_NAME_PREFIX);
}
