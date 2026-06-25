/**
 * Play persisted MVE take audio (local desktop).
 * Location: src/lib/mve/play-take-audio.ts
 */

import { resolveLocalAudioPlaybackUrl } from "@/lib/local-audio-playback-url";
import { isDesktopShell } from "@/runtime/detect-runtime";

export async function playMveTakeAudio(audioUrl: string): Promise<void> {
  if (!isDesktopShell()) {
    throw new Error("Take-Wiedergabe nur in der Desktop-App.");
  }
  if (!audioUrl.trim()) {
    throw new Error("Take hat keine Audio-Datei.");
  }
  if (audioUrl.startsWith("dummy://")) {
    throw new Error(
      "Dummy-Take ohne Datei — mit Kokoro-Stimme rendern für hörbares Audio.",
    );
  }

  const playbackUrl = await resolveLocalAudioPlaybackUrl(audioUrl);
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
      reject(new Error("Take konnte nicht abgespielt werden."));
    };
    void audio.play().catch((err) => {
      cleanup();
      reject(err instanceof Error ? err : new Error(String(err)));
    });
  });
}
