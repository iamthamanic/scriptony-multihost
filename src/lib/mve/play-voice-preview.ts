/**
 * Play a local Kokoro TTS preview (Characters panel).
 * Location: src/lib/mve/play-voice-preview.ts
 */

import { ensureKokoroSidecar, synthesizeLocal } from "@/lib/api/local-tts-api";
import { isDesktopShell } from "@/runtime/detect-runtime";

export async function playLocalVoicePreview(params: {
  projectDir: string;
  voiceId: string;
  text: string;
}): Promise<void> {
  if (!isDesktopShell()) {
    throw new Error("Voice-Vorschau nur in der Desktop-App verfügbar.");
  }

  await ensureKokoroSidecar(params.projectDir);
  const result = await synthesizeLocal({
    text: params.text,
    voice: params.voiceId,
    format: "wav",
  });

  const { convertFileSrc } = await import("@tauri-apps/api/core");
  const url = convertFileSrc(result.audioPath);
  const audio = new Audio(url);
  await audio.play();
}
