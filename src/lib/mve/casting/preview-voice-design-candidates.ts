/**
 * Preview voice design candidates via Qwen VoiceDesign VoiceCreationAdapter.
 * Location: src/lib/mve/casting/preview-voice-design-candidates.ts
 */

import type { LoadingProgressReporter } from "@/lib/loading/global-loading-progress";
import { resolveVoiceCreationAdapter } from "@/lib/multi-voice-engine/adapters/voice-creation-registry";
import type { MveVoiceDesignSpec } from "@/lib/multi-voice-engine/schema/voice-design-spec";
import { isDesktopShell } from "@/runtime/detect-runtime";
import { compileVoiceDesignPrompt } from "./compile-voice-design-prompt";
import { mveDefaultPreviewForCharacter } from "../default-preview-text";
import {
  VOICE_DESIGN_PREVIEW_COUNT,
  voiceDesignCandidateLabel,
  type VoiceDesignCandidate,
  type VoiceDesignPreviewSession,
} from "./voice-design-candidate";

export const QWEN_VOICE_DESIGN_PROVIDER_ID = "qwen-voice-design";

export interface PreviewVoiceDesignCandidatesParams {
  characterName: string;
  basicDescription?: string;
  designSpec?: MveVoiceDesignSpec | null;
  previewText?: string;
  projectDir: string;
  count?: number;
  onProgress?: LoadingProgressReporter;
}

export async function previewVoiceDesignCandidates(
  params: PreviewVoiceDesignCandidatesParams,
): Promise<VoiceDesignPreviewSession> {
  if (!isDesktopShell()) {
    throw new Error("Prompt-to-Voice nur in der Desktop-App verfügbar.");
  }

  const designPrompt = compileVoiceDesignPrompt({
    basicDescription: params.basicDescription,
    designSpec: params.designSpec,
  });
  if (!designPrompt) {
    throw new Error("Bitte zuerst eine Stimmbeschreibung eingeben.");
  }

  const projectDir = params.projectDir.trim();
  if (!projectDir) {
    throw new Error("Lokales Projekt erforderlich für Voice Design.");
  }

  const previewText =
    params.previewText?.trim() ||
    mveDefaultPreviewForCharacter(params.characterName);
  const count = params.count ?? VOICE_DESIGN_PREVIEW_COUNT;

  params.onProgress?.({
    percent: 8,
    message: "Qwen VoiceDesign wird vorbereitet…",
    phase: "voice-design",
  });

  const adapter = resolveVoiceCreationAdapter(QWEN_VOICE_DESIGN_PROVIDER_ID);
  const generated = await adapter.generateCandidates({
    description: designPrompt,
    previewText,
    language: "German",
    candidateCount: count,
    projectDir,
  });

  const candidates: VoiceDesignCandidate[] = generated.candidates.map(
    (candidate, index) => ({
      id: candidate.id,
      providerSessionId: generated.sessionId,
      providerCandidateId: candidate.id,
      index: index as 0 | 1 | 2,
      label:
        (candidate.label as VoiceDesignCandidate["label"]) ??
        voiceDesignCandidateLabel(index),
      audioUrl: candidate.audioUrl,
    }),
  );

  if (!candidates.some((candidate) => candidate.audioUrl)) {
    throw new Error("Keine Stimm-Kandidaten konnten erzeugt werden.");
  }

  params.onProgress?.({
    percent: 95,
    message: "Stimm-Kandidaten bereit.",
    phase: "voice-design",
  });

  return {
    sessionId: generated.sessionId,
    designPrompt,
    designSpec: params.designSpec ?? null,
    candidates,
  };
}

/** Qwen sessions are ephemeral — no Voicebox profile cleanup required. */
export async function discardVoiceDesignPreviewSession(
  _session: VoiceDesignPreviewSession | null | undefined,
): Promise<void> {
  return;
}

export async function discardVoiceDesignCandidatesExcept(
  _session: VoiceDesignPreviewSession,
  _keepProviderCandidateId: string,
): Promise<void> {
  return;
}
