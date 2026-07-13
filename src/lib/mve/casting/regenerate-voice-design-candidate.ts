/**
 * Regenerate a single failed or unwanted voice design candidate.
 * Location: src/lib/mve/casting/regenerate-voice-design-candidate.ts
 */

import {
  createDesignedVoiceboxProfile,
  deleteVoiceboxProfile,
  ensureVoiceboxSidecar,
} from "@/lib/api/voicebox-api";
import type {
  VoiceDesignCandidate,
  VoiceDesignCandidateSynthesisProgress,
  VoiceDesignPreviewSession,
} from "./voice-design-candidate";
import { voiceDesignCandidatePrompt } from "./voice-design-candidate-variation";
import { synthesizeVoiceDesignCandidatePreview } from "./synthesize-voice-design-candidate-preview";
import { VOICE_DESIGN_PREVIEW_NAME_PREFIX } from "./voice-design-candidate";

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
    throw new Error("Lokales Projekt erforderlich für Voicebox.");
  }

  await ensureVoiceboxSidecar();

  const nextVariationAttempt = (params.candidate.variationAttempt ?? 0) + 1;
  const designPrompt = voiceDesignCandidatePrompt(
    params.session.designPrompt,
    params.candidate.index,
    nextVariationAttempt,
  );

  params.onProgress?.(params.candidate.id, {
    status: "synthesizing",
    percent: 5,
    message: `Kandidat ${params.candidate.label} wird neu erzeugt…`,
  });

  const oldProfileId = params.candidate.voiceboxProfileId;
  await deleteVoiceboxProfile(oldProfileId).catch(() => undefined);

  const profile = await createDesignedVoiceboxProfile({
    name: `${VOICE_DESIGN_PREVIEW_NAME_PREFIX}${params.session.sessionId}-${params.candidate.index}-r${nextVariationAttempt}`,
    designPrompt,
    language: "de",
    description: designPrompt.slice(0, 500),
  });

  const candidateBase: VoiceDesignCandidate = {
    ...params.candidate,
    voiceboxProfileId: profile.id,
    previewAudioPath: undefined,
    variationAttempt: nextVariationAttempt,
  };

  try {
    const updated = await synthesizeVoiceDesignCandidatePreview({
      candidate: candidateBase,
      characterName: params.characterName,
      previewText: params.previewText,
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
      message: err instanceof Error ? err.message : "Synthese fehlgeschlagen",
    });
    return candidateBase;
  }
}
