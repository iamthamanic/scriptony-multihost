/**
 * Qwen VoiceDesign VoiceCreationAdapter — prompt-to-voice identity via local sidecar.
 * Location: src/lib/multi-voice-engine/adapters/qwen-voice-design.adapter.ts
 */

import {
  generateQwenVoiceDesignCandidates,
  materializeQwenVoiceDesign,
  QWEN_VOICE_DESIGN_DEFAULT_CANDIDATE_COUNT,
  QWEN_VOICE_DESIGN_MAX_CANDIDATE_COUNT,
} from "@/lib/api/qwen-voice-design-api";
import { ensureVoiceDesignSidecarReady } from "@/lib/local/voice-design-sidecar-lifecycle";
import type {
  GenerateVoiceCandidatesInput,
  GenerateVoiceCandidatesOutput,
  MaterializeVoiceInput,
  MaterializeVoiceOutput,
  VoiceCreationAdapter,
} from "./voice-creation-adapter";

export class QwenVoiceDesignAdapter implements VoiceCreationAdapter {
  readonly providerId = "qwen-voice-design";

  readonly capabilities = {
    supportsVoiceDesign: true,
    supportsMaterialize: true,
    maxCandidateCount: QWEN_VOICE_DESIGN_MAX_CANDIDATE_COUNT,
  } as const;

  async generateCandidates(
    input: GenerateVoiceCandidatesInput,
  ): Promise<GenerateVoiceCandidatesOutput> {
    await ensureVoiceDesignSidecarReady();

    const response = await generateQwenVoiceDesignCandidates({
      description: input.description,
      previewText: input.previewText,
      language: input.language,
      candidateCount:
        input.candidateCount ?? QWEN_VOICE_DESIGN_DEFAULT_CANDIDATE_COUNT,
    });

    return {
      sessionId: response.sessionId,
      candidates: response.candidates.map((candidate) => ({
        id: candidate.id,
        label: candidate.label,
        audioUrl: candidate.audioUrl,
        description: candidate.description,
        durationMs: candidate.durationMs,
        sampleRate: candidate.sampleRate,
      })),
    };
  }

  async materialize(
    input: MaterializeVoiceInput,
  ): Promise<MaterializeVoiceOutput> {
    await ensureVoiceDesignSidecarReady();

    const response = await materializeQwenVoiceDesign({
      sessionId: input.sessionId,
      candidateId: input.candidateId,
      name: input.name,
      previewText: input.previewText,
      projectId: input.projectId,
      projectDir: input.projectDir,
    });

    return {
      referenceAudioAssetId: response.referenceAudioAssetId,
      referenceAudioUrl: response.referenceAudioUrl,
      referenceText: response.referenceText,
      identityPrompt: response.identityPrompt,
    };
  }
}

export const qwenVoiceDesignAdapter = new QwenVoiceDesignAdapter();
