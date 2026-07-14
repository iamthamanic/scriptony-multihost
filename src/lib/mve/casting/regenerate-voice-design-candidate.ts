/**
 * Regenerate a single failed or unwanted voice design candidate via VoiceCreationAdapter.
 * Location: src/lib/mve/casting/regenerate-voice-design-candidate.ts
 */

import { resolveVoiceCreationAdapter } from "@/lib/multi-voice-engine/adapters/voice-creation-registry";
import { mveDefaultPreviewForCharacter } from "../default-preview-text";
import type {
  VoiceDesignCandidate,
  VoiceDesignCandidateSynthesisProgress,
  VoiceDesignPreviewSession,
} from "./voice-design-candidate";
import { voiceDesignCandidatePrompt } from "./voice-design-candidate-variation";
import { synthesizeVoiceDesignCandidatePreview } from "./synthesize-voice-design-candidate-preview";
import { QWEN_VOICE_DESIGN_PROVIDER_ID } from "./preview-voice-design-candidates";

export interface RegenerateVoiceDesignCandidateParams {
  session: VoiceDesignPreviewSession;
  candidate: VoiceDesignCandidate;
  characterName: string;
  previewText?: string;
  projectDir: string;
  onProgress?: (
    candidateId: string,
    progress: VoiceDesignCandidateSynthesisProgress,
  ) => void;
}

export async function regenerateVoiceDesignCandidate(
  params: RegenerateVoiceDesignCandidateParams,
): Promise<VoiceDesignCandidate> {
  const projectDir = params.projectDir.trim();
  if (!projectDir) {
    throw new Error("Lokales Projekt erforderlich für Voice Design.");
  }

  const nextVariationAttempt = (params.candidate.variationAttempt ?? 0) + 1;
  const variedDescription = voiceDesignCandidatePrompt(
    params.session.designPrompt,
    params.candidate.index,
    nextVariationAttempt,
  );
  const previewText =
    params.previewText?.trim() ||
    mveDefaultPreviewForCharacter(params.characterName);

  params.onProgress?.(params.candidate.id, {
    status: "synthesizing",
    percent: 5,
    message: `Kandidat ${params.candidate.label} wird neu erzeugt…`,
  });

  const adapter = resolveVoiceCreationAdapter(QWEN_VOICE_DESIGN_PROVIDER_ID);
  const generated = await adapter.generateCandidates({
    description: variedDescription,
    previewText,
    language: "German",
    candidateCount: 1,
    projectDir,
  });

  const next = generated.candidates[0];
  if (!next?.audioUrl) {
    throw new Error("Kandidat konnte nicht neu erzeugt werden.");
  }

  const candidateBase: VoiceDesignCandidate = {
    ...params.candidate,
    id: next.id,
    providerSessionId: generated.sessionId,
    providerCandidateId: next.id,
    audioUrl: next.audioUrl,
    previewAudioPath: undefined,
    errorMessage: undefined,
    variationAttempt: nextVariationAttempt,
  };

  try {
    const updated = await synthesizeVoiceDesignCandidatePreview({
      candidate: candidateBase,
      characterName: params.characterName,
      previewText,
      projectDir,
      variationAttempt: nextVariationAttempt,
      onProgress: (progress) => {
        params.onProgress?.(params.candidate.id, progress);
      },
    });
    params.onProgress?.(params.candidate.id, {
      status: "ready",
      percent: 100,
      message: "Bereit zum Anhören",
    });
    return updated;
  } catch (err) {
    params.onProgress?.(params.candidate.id, {
      status: "error",
      percent: 0,
      message: err instanceof Error ? err.message : "Vorschau fehlgeschlagen",
    });
    return candidateBase;
  }
}
