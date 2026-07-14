/**
 * Shared progress steps for voice preview / TTS synthesis UI.
 * Location: src/lib/mve/voice-preview-progress.ts
 */

import type { LoadingProgressReporter } from "@/lib/loading/global-loading-progress";

type VoicePreviewProgress = Parameters<LoadingProgressReporter>[0];

export const SYNTHESIS_PROGRESS: VoicePreviewProgress = {
  percent: 72,
  message: "Sprache wird synthetisiert…",
  phase: "synthesis",
};

export const PLAYBACK_PROGRESS: VoicePreviewProgress = {
  percent: 92,
  message: "Vorschau wird abgespielt…",
  phase: "playback",
};
