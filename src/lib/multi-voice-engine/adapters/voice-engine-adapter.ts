/**
 * VoiceEngineAdapter interface (PRD §12.7) — no DB/UI imports.
 * Location: src/lib/multi-voice-engine/adapters/voice-engine-adapter.ts
 */

import type { MveVoiceProfile } from "../schema/voice-profile";
import type { RenderLineInput, RenderLineOutput } from "../schema/render-line";

export interface VoiceEngineCapabilities {
  supportsTextToSpeech: boolean;
  supportsVoiceCloning: boolean;
  supportsVoiceGenerationFromPrompt: boolean;
  supportsVoiceTuning: boolean;
  supportsPerformanceReference: boolean;
  supportsEmotion: boolean;
  supportsSSML: boolean;
}

export interface VoiceEngineAdapter {
  readonly engineName: string;
  readonly capabilities: VoiceEngineCapabilities;

  renderLine(input: RenderLineInput): Promise<RenderLineOutput>;

  generateVoice?(input: unknown): Promise<MveVoiceProfile>;
  cloneVoice?(input: unknown): Promise<MveVoiceProfile>;
  tuneVoice?(input: unknown): Promise<MveVoiceProfile>;
}

export class UnknownVoiceEngineError extends Error {
  constructor(engine: string) {
    super(`Unbekannte TTS-Engine: ${engine}`);
    this.name = "UnknownVoiceEngineError";
  }
}
