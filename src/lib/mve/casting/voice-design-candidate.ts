/**
 * Ephemeral voice design preview candidate (Qwen VoiceDesign session + preview audio).
 * Location: src/lib/mve/casting/voice-design-candidate.ts
 */

import type { MveVoiceDesignSpec } from "@/lib/multi-voice-engine/schema/voice-design-spec";

export const VOICE_DESIGN_PREVIEW_COUNT = 3;

export type VoiceDesignCandidateSynthesisStatus =
  | "pending"
  | "synthesizing"
  | "ready"
  | "error";

export interface VoiceDesignCandidateSynthesisProgress {
  status: VoiceDesignCandidateSynthesisStatus;
  percent: number;
  message: string;
}

export interface VoiceDesignCandidate {
  /** Session-local id (matches provider candidate id when present). */
  id: string;
  /** Qwen VoiceDesign session id (`vd_sess_…`). */
  providerSessionId: string;
  /** Qwen candidate id (`candidate-1`, …). */
  providerCandidateId: string;
  index: 0 | 1 | 2;
  label: "A" | "B" | "C";
  /** Sidecar audio reference (`local://voice-design/sessions/…`). */
  audioUrl?: string;
  /** Resolved playback source (blob:, http, or absolute path). */
  previewAudioPath?: string;
  /** Set when generation or playback prep failed. */
  errorMessage?: string;
  /** Increments on per-candidate regenerate (new sidecar session + prompt variant). */
  variationAttempt?: number;
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
