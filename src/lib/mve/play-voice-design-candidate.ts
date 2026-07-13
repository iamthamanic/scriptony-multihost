/**
 * Play local preview audio for a voice design candidate.
 * Location: src/lib/mve/play-voice-design-candidate.ts
 */

import { resolveLocalAudioPlaybackUrl } from "@/lib/local-audio-playback-url";
import { isDesktopShell } from "@/runtime/detect-runtime";

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
