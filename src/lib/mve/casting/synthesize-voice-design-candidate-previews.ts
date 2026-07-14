/**
 * Prepare preview playback for all voice design candidates (parallel fetch).
 * Location: src/lib/mve/casting/synthesize-voice-design-candidate-previews.ts
 */

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
    throw new Error("Lokales Projekt erforderlich für Voice Design.");
  }

  const count = params.session.candidates.length;
  const results: VoiceDesignCandidate[] = new Array(count);
  const loadableIndices: number[] = [];

  for (let index = 0; index < count; index += 1) {
    const candidate = params.session.candidates[index];
    if (!candidate) continue;

    if (!candidate.audioUrl?.trim()) {
      results[index] = candidate;
      params.onCandidateProgress?.(candidate.id, {
        status: "error",
        percent: 0,
        message:
          candidate.errorMessage ??
          "Kandidaten-Audio konnte nicht erzeugt werden.",
      });
      continue;
    }

    loadableIndices.push(index);
  }

  const loadAt = async (index: number): Promise<void> => {
    const candidate = params.session.candidates[index];
    if (!candidate) return;

    params.onCandidateProgress?.(candidate.id, {
      status: "synthesizing",
      percent: mapSynthesisPercent(index, count, 8),
      message: `Kandidat ${candidate.label} wird vorbereitet…`,
    });

    try {
      const updated = await synthesizeVoiceDesignCandidatePreview({
        candidate,
        characterName: params.characterName,
        previewText: params.previewText,
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
        err instanceof Error ? err.message : "Vorschau fehlgeschlagen";
      results[index] = { ...candidate, errorMessage: message };
      params.onCandidateProgress?.(candidate.id, {
        status: "error",
        percent: 0,
        message,
      });
    }
  };

  if (loadableIndices.length === 0) {
    return params.session.candidates.map(
      (candidate, index) => results[index] ?? candidate,
    );
  }

  const [warmupIndex, ...parallelIndices] = loadableIndices;
  await loadAt(warmupIndex);
  if (parallelIndices.length > 0) {
    await Promise.all(parallelIndices.map((index) => loadAt(index)));
  }

  return params.session.candidates.map(
    (candidate, index) => results[index] ?? candidate,
  );
}
