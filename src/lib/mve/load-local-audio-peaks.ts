/**
 * Decode local preview audio into waveform peaks for inline players.
 * Location: src/lib/mve/load-local-audio-peaks.ts
 */

import { resolveLocalAudioPlaybackUrl } from "@/lib/local-audio-playback-url";
import { peaksFromAudioBuffer } from "@/lib/timeline-add-audio";

export interface LocalAudioPeaksResult {
  playbackUrl: string;
  peaks: number[];
  durationSec: number;
}

export async function loadLocalAudioPeaks(
  absPath: string,
  samples = 96,
): Promise<LocalAudioPeaksResult> {
  const playbackUrl = await resolveLocalAudioPlaybackUrl(absPath);
  const response = await fetch(playbackUrl);
  if (!response.ok) {
    throw new Error("Audio konnte nicht geladen werden.");
  }

  const arrayBuffer = await response.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    return {
      playbackUrl,
      peaks: peaksFromAudioBuffer(buffer, samples),
      durationSec: buffer.duration,
    };
  } finally {
    await ctx.close();
  }
}
