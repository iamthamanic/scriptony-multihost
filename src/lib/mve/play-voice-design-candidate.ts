/**
 * Play voice design candidate with live TTS using current preview sentence.
 * Location: src/lib/mve/play-voice-design-candidate.ts
 */

import type { LoadingProgressReporter } from "@/lib/loading/global-loading-progress";
import { resolveLocalAudioPlaybackUrl } from "@/lib/local-audio-playback-url";
import { isDesktopShell } from "@/runtime/detect-runtime";
import { playLocalVoicePreview } from "./play-voice-preview";

export async function playVoiceDesignCandidateAudio(
  audioPath: string,
): Promise<void> {
  if (!isDesktopShell()) {
    throw new Error("Vorschau nur in der Desktop-App.");
  }
  if (!audioPath.trim()) {
    throw new Error("Keine Vorschau-Audio-Datei für diesen Kandidaten.");
  }

  const playbackUrl = await resolveLocalAudioPlaybackUrl(audioPath);
  await new Promise<void>((resolve, reject) => {
    const audio = new Audio(playbackUrl);
    const cleanup = () => {
      if (playbackUrl.startsWith("blob:")) URL.revokeObjectURL(playbackUrl);
    };
    audio.onended = () => {
      cleanup();
      resolve();
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error("Kandidat konnte nicht abgespielt werden."));
    };
    void audio.play().catch((err) => {
      cleanup();
      reject(err instanceof Error ? err : new Error(String(err)));
    });
  });
}

export async function playVoiceDesignCandidateLive(params: {
  voiceboxProfileId: string;
  previewText: string;
  projectDir: string;
  speed?: number;
  onProgress?: LoadingProgressReporter;
}): Promise<void> {
  const text = params.previewText.trim();
  if (!text) {
    throw new Error("Bitte einen Standard-Satz für die Vorschau eingeben.");
  }
  if (!params.projectDir.trim()) {
    throw new Error("Lokales Projekt erforderlich für Voicebox.");
  }

  await playLocalVoicePreview({
    projectDir: params.projectDir,
    voiceId: params.voiceboxProfileId,
    text,
    speed: params.speed,
    engine: "voicebox",
    onProgress: params.onProgress,
  });
}
