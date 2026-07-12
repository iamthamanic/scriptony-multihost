/**
 * Decode a local audio file into waveform peaks + duration (for timeline clips).
 * Location: src/lib/mve/decode-local-audio-to-peaks.ts
 */

import { resolveLocalAudioPlaybackUrl } from "@/lib/local-audio-playback-url";
import {
  decodeAudioFileToPeaks,
  peaksFromAudioBuffer,
} from "@/lib/timeline-add-audio";

export interface DecodedAudioPeaks {
  peaks: number[];
  durationSec: number;
}

const DEFAULT_SAMPLES = 64;

/**
 * Load a local audio file (Tauri) and extract timeline peaks + duration.
 *
 * Falls back to a direct fetch if `resolveLocalAudioPlaybackUrl` returns an
 * http/asset URL, or decodes via File/blob for blob: URLs.
 */
export async function decodeLocalAudioToPeaks(
  absPath: string,
  samples = DEFAULT_SAMPLES,
): Promise<DecodedAudioPeaks> {
  if (!absPath.trim()) {
    throw new Error("Audio-Pfad fehlt.");
  }

  const playbackUrl = await resolveLocalAudioPlaybackUrl(absPath);

  // blob: URLs created by readLocalAudioAsBlobUrl can be fetched directly.
  if (playbackUrl.startsWith("blob:")) {
    const resp = await fetch(playbackUrl);
    const arrayBuffer = await resp.arrayBuffer();
    const ctx = new AudioContext();
    try {
      const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      return {
        peaks: peaksFromAudioBuffer(buffer, samples),
        durationSec: buffer.duration,
      };
    } finally {
      await ctx.close();
    }
  }

  // http://127.0.0.1:8080/... or asset:// paths — fetch the bytes.
  const resp = await fetch(playbackUrl);
  if (!resp.ok) {
    throw new Error(`Audio konnte nicht geladen werden: ${resp.status}`);
  }
  const blob = await resp.blob();
  const decoded = await decodeAudioFileToPeaks(
    new File([blob], "take.wav", { type: "audio/wav" }),
  );

  return {
    peaks: decoded.peaks,
    durationSec: decoded.durationSec,
  };
}
