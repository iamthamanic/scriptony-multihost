/**
 * Prepare preview playback for one Qwen VoiceDesign candidate (fetch WAV, no TTS).
 * Location: src/lib/mve/casting/synthesize-voice-design-candidate-preview.ts
 */

import type {
  VoiceDesignCandidate,
  VoiceDesignCandidateSynthesisProgress,
} from "./voice-design-candidate";
import { fetchVoiceDesignCandidatePlaybackUrl } from "./voice-design-candidate-audio";

export interface SynthesizeVoiceDesignCandidatePreviewParams {
  candidate: VoiceDesignCandidate;
  characterName: string;
  previewText?: string;
  projectDir: string;
  variationAttempt?: number;
  onProgress?: (progress: VoiceDesignCandidateSynthesisProgress) => void;
}

export async function synthesizeVoiceDesignCandidatePreview(
  params: SynthesizeVoiceDesignCandidatePreviewParams,
): Promise<VoiceDesignCandidate> {
  const audioUrl = params.candidate.audioUrl?.trim();
  if (!audioUrl) {
    throw new Error(params.candidate.errorMessage ?? "Kandidaten-Audio fehlt.");
  }

  const variationAttempt =
    params.variationAttempt ?? params.candidate.variationAttempt ?? 0;

  params.onProgress?.({
    status: "synthesizing",
    percent: 12,
    message: `Kandidat ${params.candidate.label} wird vorbereitet…`,
  });

  const previewAudioPath = await fetchVoiceDesignCandidatePlaybackUrl(audioUrl);

  params.onProgress?.({
    status: "synthesizing",
    percent: 90,
    message: `Kandidat ${params.candidate.label} bereit…`,
  });

  return {
    ...params.candidate,
    variationAttempt,
    previewAudioPath,
  };
}
