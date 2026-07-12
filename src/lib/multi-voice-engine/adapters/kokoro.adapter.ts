/**
 * Kokoro VoiceEngineAdapter — wraps local sidecar/Tauri TTS.
 * Location: src/lib/multi-voice-engine/adapters/kokoro.adapter.ts
 */

import { ensureKokoroSidecar, synthesizeLocal } from "@/lib/api/local-tts-api";
import { resolveMveTtsVoiceId } from "@/lib/mve/resolve-tts-voice-id";
import type { RenderLineInput, RenderLineOutput } from "../schema/render-line";
import type { VoiceEngineAdapter } from "./voice-engine-adapter";

function resolveSpeed(input: RenderLineInput): number {
  return (
    input.renderSettings?.speed ?? input.voice.defaultSettings?.speed ?? 1.0
  );
}

export class KokoroVoiceEngineAdapter implements VoiceEngineAdapter {
  readonly engineName = "kokoro";

  readonly capabilities = {
    supportsTextToSpeech: true,
    supportsVoiceCloning: false,
    supportsVoiceGenerationFromPrompt: false,
    supportsVoiceTuning: false,
    supportsPerformanceReference: false,
    supportsEmotion: false,
    supportsSSML: false,
  } as const;

  async renderLine(input: RenderLineInput): Promise<RenderLineOutput> {
    const voiceId = resolveMveTtsVoiceId(input.voice);
    if (!voiceId) {
      throw new Error("VoiceProfile hat keine Kokoro-Stimme (baseVoiceId).");
    }

    if (input.projectDir) {
      await ensureKokoroSidecar(input.projectDir);
    }

    const result = await synthesizeLocal({
      text: input.text,
      voice: voiceId,
      speed: resolveSpeed(input),
      format: "wav",
    });

    if (!result.audioPath?.trim()) {
      throw new Error("Kokoro hat keine Audio-Datei erzeugt.");
    }

    return {
      audioUrl: result.audioPath,
      durationMs:
        result.duration > 0 ? Math.round(result.duration * 1000) : undefined,
    };
  }
}

export const kokoroVoiceEngineAdapter = new KokoroVoiceEngineAdapter();
