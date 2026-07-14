/**
 * Synthesize preview audio for voice design candidates (TTS only, no playback).
 * Location: src/lib/mve/casting/synthesize-voice-design-candidate-previews.ts
 */

import { ensureVoiceboxSidecar } from "@/lib/api/voicebox-api";
import { mveDefaultPreviewForCharacter } from "../default-preview-text";
import type {
  VoiceDesignCandidate,
  VoiceDesignCandidateSynthesisProgress,
  VoiceDesignPreviewSession,
} from "./voice-design-candidate";
import { synthesizeVoiceDesignCandidatePreview } from "./synthesize-voice-design-candidate-preview";

export interface SynthesizeVoiceDesignCandidatePreviewsParams {
  session: VoiceDesignPreviewSession;
  characterName: string;
  previewText?: string;
  projectDir: string;
  onCandidateProgress?: (
    candidateId: string,
    progress: VoiceDesignCandidateSynthesisProgress,
  ) => void;
  onCandidateUpdated?: (candidate: VoiceDesignCandidate) => void;
}

function mapSynthesisPercent(
  candidateIndex: number,
  candidateCount: number,
  innerPercent: number,
): number {
  const slice = 100 / candidateCount;
  const base = candidateIndex * slice;
  return Math.min(99, Math.round(base + (innerPercent / 100) * slice));
}

export async function synthesizeVoiceDesignCandidatePreviews(
  params: SynthesizeVoiceDesignCandidatePreviewsParams,
): Promise<VoiceDesignCandidate[]> {
  const projectDir = params.projectDir.trim();
  if (!projectDir) {
    throw new Error("Lokales Projekt erforderlich für Voicebox.");
  }

  const previewText =
    params.previewText?.trim() ||
    mveDefaultPreviewForCharacter(params.characterName);

  await ensureVoiceboxSidecar();

  const count = params.session.candidates.length;
  const results: VoiceDesignCandidate[] = new Array(count);
  const synthesizableIndices: number[] = [];

  for (let index = 0; index < count; index += 1) {
    const candidate = params.session.candidates[index];
    if (!candidate) continue;

    if (!candidate.voiceboxProfileId.trim()) {
      results[index] = candidate;
      params.onCandidateProgress?.(candidate.id, {
        status: "error",
        percent: 0,
        message:
          candidate.errorMessage ?? "Profil konnte nicht erzeugt werden.",
      });
      continue;
    }

    synthesizableIndices.push(index);
  }

  const synthesizeAt = async (index: number): Promise<void> => {
    const candidate = params.session.candidates[index];
    if (!candidate) return;

    params.onCandidateProgress?.(candidate.id, {
      status: "synthesizing",
      percent: mapSynthesisPercent(index, count, 8),
      message: `Kandidat ${candidate.label} wird synthetisiert…`,
    });

    try {
      const updated = await synthesizeVoiceDesignCandidatePreview({
        candidate,
        characterName: params.characterName,
        previewText,
        projectDir,
        onProgress: (progress) => {
          params.onCandidateProgress?.(candidate.id, {
            ...progress,
            percent: mapSynthesisPercent(index, count, progress.percent),
          });
        },
      });
      results[index] = updated;
      params.onCandidateUpdated?.(updated);
      params.onCandidateProgress?.(candidate.id, {
        status: "ready",
        percent: 100,
        message: "Bereit zum Anhören",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Synthese fehlgeschlagen";
      results[index] = { ...candidate, errorMessage: message };
      params.onCandidateProgress?.(candidate.id, {
        status: "error",
        percent: 0,
        message,
      });
    }
  };

  if (synthesizableIndices.length === 0) {
    return params.session.candidates.map(
      (candidate, index) => results[index] ?? candidate,
    );
  }

  const [warmupIndex, ...parallelIndices] = synthesizableIndices;
  await synthesizeAt(warmupIndex);
  if (parallelIndices.length > 0) {
    await Promise.all(parallelIndices.map((index) => synthesizeAt(index)));
  }

  return params.session.candidates.map(
    (candidate, index) => results[index] ?? candidate,
  );
}
