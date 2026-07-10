/**
 * Voicebox VoiceEngineAdapter — HTTP TTS via local Voicebox app.
 * Location: src/lib/multi-voice-engine/adapters/voicebox.adapter.ts
 */

import {
  ensureVoiceboxAvailable,
  generateVoiceboxSpeech,
} from "@/lib/api/voicebox-api";
import { resolveMveTtsVoiceId } from "@/lib/mve/resolve-tts-voice-id";
import type { RenderLineInput, RenderLineOutput } from "../schema/render-line";
import type { VoiceEngineAdapter } from "./voice-engine-adapter";

export class VoiceboxVoiceEngineAdapter implements VoiceEngineAdapter {
  readonly engineName = "voicebox";

  readonly capabilities = {
    supportsTextToSpeech: true,
    supportsVoiceCloning: true,
    supportsVoiceGenerationFromPrompt: false,
    supportsVoiceTuning: false,
    supportsPerformanceReference: false,
    supportsEmotion: true,
    supportsSSML: false,
  } as const;

  async renderLine(input: RenderLineInput): Promise<RenderLineOutput> {
    const profileId = resolveMveTtsVoiceId(input.voice);
    if (!profileId) {
      throw new Error(
        "VoiceProfile hat keine Voicebox profile_id (baseVoiceId).",
      );
    }

    await ensureVoiceboxAvailable();

    const result = await generateVoiceboxSpeech({
      text: input.text,
      profileId,
      language: input.language,
      projectDir: input.projectDir,
    });

    if (!result.audioPath?.trim()) {
      throw new Error("Voicebox hat keine Audio-Datei erzeugt.");
    }

    return {
      audioUrl: result.audioPath,
      durationMs: result.durationMs,
    };
  }
}

export const voiceboxVoiceEngineAdapter = new VoiceboxVoiceEngineAdapter();
