/**
 * VoiceCreationAdapter — prompt-to-voice identity (Qwen VoiceDesign, ElevenLabs, …).
 * Separate from VoiceEngineAdapter (line TTS render).
 * Location: src/lib/multi-voice-engine/adapters/voice-creation-adapter.ts
 */

export interface VoiceCreationCapabilities {
  supportsVoiceDesign: boolean;
  supportsMaterialize: boolean;
  maxCandidateCount: number;
}

export interface VoiceDesignCandidateResult {
  id: string;
  label?: string;
  audioUrl: string;
  description: string;
  durationMs?: number;
  sampleRate?: number;
}

export interface GenerateVoiceCandidatesInput {
  description: string;
  previewText: string;
  language: string;
  candidateCount?: number;
  projectDir?: string;
}

export interface GenerateVoiceCandidatesOutput {
  sessionId: string;
  candidates: VoiceDesignCandidateResult[];
}

export interface MaterializeVoiceInput {
  sessionId: string;
  candidateId: string;
  name: string;
  previewText: string;
  projectId: string;
  projectDir: string;
}

export interface MaterializeVoiceOutput {
  referenceAudioAssetId: string;
  referenceAudioUrl: string;
  referenceText: string;
  identityPrompt: string;
}

export interface VoiceCreationAdapter {
  readonly providerId: string;
  readonly capabilities: VoiceCreationCapabilities;

  generateCandidates(
    input: GenerateVoiceCandidatesInput,
  ): Promise<GenerateVoiceCandidatesOutput>;

  materialize(input: MaterializeVoiceInput): Promise<MaterializeVoiceOutput>;
}

export class UnknownVoiceCreationProviderError extends Error {
  constructor(providerId: string) {
    super(`Unbekannter Voice-Creation-Provider: ${providerId}`);
    this.name = "UnknownVoiceCreationProviderError";
  }
}
