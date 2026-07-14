/**
 * ElevenLabs VoiceEngineAdapter — direct cloud API with user API key.
 * Location: src/lib/multi-voice-engine/adapters/elevenlabs.adapter.ts
 */

import { synthesizeElevenLabsSpeech } from "@/lib/api/elevenlabs-api";
import { resolveMveTtsVoiceId } from "@/lib/mve/resolve-tts-voice-id";
import { isDesktopShell } from "@/runtime/detect-runtime";
import type { RenderLineInput, RenderLineOutput } from "../schema/render-line";
import type { VoiceEngineAdapter } from "./voice-engine-adapter";

async function saveMp3ToProject(
  projectDir: string,
  bytes: ArrayBuffer,
): Promise<string> {
  const { join } = await import("@tauri-apps/api/path");
  const { mkdir, writeFile } = await import("@tauri-apps/plugin-fs");
  const dir = await join(projectDir, ".scriptony", "elevenlabs-output");
  await mkdir(dir, { recursive: true });
  const fileName = `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`;
  const filePath = await join(dir, fileName);
  await writeFile(filePath, new Uint8Array(bytes));
  return filePath;
}

export class ElevenLabsVoiceEngineAdapter implements VoiceEngineAdapter {
  readonly engineName = "elevenlabs";

  readonly capabilities = {
    supportsTextToSpeech: true,
    supportsVoiceCloning: false,
    supportsVoiceGenerationFromPrompt: false,
    supportsVoiceTuning: false,
    supportsPerformanceReference: false,
    supportsEmotion: true,
    supportsSSML: false,
  } as const;

  async renderLine(input: RenderLineInput): Promise<RenderLineOutput> {
    const voiceId = resolveMveTtsVoiceId(input.voice);
    if (!voiceId) {
      throw new Error(
        "VoiceProfile hat keine ElevenLabs voice_id (baseVoiceId).",
      );
    }

    const speed =
      input.renderSettings?.speed ?? input.voice.defaultSettings?.speed ?? 1;

    const bytes = await synthesizeElevenLabsSpeech({
      text: input.text,
      voiceId,
      speed,
    });

    if (input.projectDir?.trim() && isDesktopShell()) {
      const audioUrl = await saveMp3ToProject(input.projectDir.trim(), bytes);
      return { audioUrl };
    }

    const blob = new Blob([bytes], { type: "audio/mpeg" });
    return { audioUrl: URL.createObjectURL(blob) };
  }
}

export const elevenlabsVoiceEngineAdapter = new ElevenLabsVoiceEngineAdapter();
