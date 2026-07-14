/**
 * Synthesize preview audio for one voice design candidate (no playback).
 * Location: src/lib/mve/casting/synthesize-voice-design-candidate-preview.ts
 */

import { generateVoiceboxSpeech } from "@/lib/api/voicebox-api";
import { mveDefaultPreviewForCharacter } from "../default-preview-text";
import type {
  VoiceDesignCandidate,
  VoiceDesignCandidateSynthesisProgress,
} from "./voice-design-candidate";
import { voiceDesignCandidateTtsSeed } from "./voice-design-candidate-variation";

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
  const projectDir = params.projectDir.trim();
  if (!projectDir) {
    throw new Error("Lokales Projekt erforderlich für Voicebox.");
  }

  const previewText =
    params.previewText?.trim() ||
    mveDefaultPreviewForCharacter(params.characterName);
  const variationAttempt =
    params.variationAttempt ?? params.candidate.variationAttempt ?? 0;

  params.onProgress?.({
    status: "synthesizing",
    percent: 12,
    message: `Kandidat ${params.candidate.label} wird synthetisiert…`,
  });

  const generated = await generateVoiceboxSpeech({
    text: previewText,
    profileId: params.candidate.voiceboxProfileId,
    language: "de",
    projectDir,
    engine: "qwen_custom_voice",
    seed: voiceDesignCandidateTtsSeed(params.candidate.index, variationAttempt),
    onProgress: (update) => {
      params.onProgress?.({
        status: "synthesizing",
        percent: Math.min(98, update.percent),
        message: update.message,
      });
    },
  });

  return {
    ...params.candidate,
    variationAttempt,
    previewAudioPath: generated.audioPath,
  };
}
