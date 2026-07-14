/**
 * Persist uploaded/recorded audio into .scriptony/assets/audio (Tauri local).
 */

import {
  isLocalProfile,
  requireLocalBackend,
} from "@/lib/api-adapter/runtime-dispatch";
import { LocalStorageService } from "@/backend/local/LocalStorageService";
import { decodeAudioFileToPeaks } from "./timeline-add-audio";
import { resolveLocalAudioPlaybackUrl } from "./local-audio-playback-url";

export async function resolveClipPlaybackUrl(
  audioFileId: string | undefined,
): Promise<string | null> {
  if (!audioFileId) return null;
  if (audioFileId.startsWith("blob:") || audioFileId.startsWith("http")) {
    return audioFileId;
  }
  if (!isLocalProfile()) return audioFileId;

  try {
    const backend = requireLocalBackend();
    const abs = `${backend.localProject.dirPath}/${audioFileId.replace(/^\/+/, "")}`;
    return await resolveLocalAudioPlaybackUrl(abs);
  } catch {
    return null;
  }
}

/** Save audio file to project assets; returns path for clip.audioFileId + playback URL. */
export async function persistClipAudioFile(file: File): Promise<{
  storagePath: string;
  playbackUrl: string;
  peaks: number[];
  durationSec: number;
}> {
  const { objectUrl, peaks, durationSec } = await decodeAudioFileToPeaks(file);

  if (!isLocalProfile()) {
    return {
      storagePath: objectUrl,
      playbackUrl: objectUrl,
      peaks,
      durationSec,
    };
  }

  const backend = requireLocalBackend();
  const storage = new LocalStorageService(backend.localProject.dirPath);
  const copied = await storage.copyIntoProjectAssets(file, "audio");
  const abs = `${backend.localProject.dirPath}/${copied.relativePath}`;
  const { convertFileSrc } = await import("@tauri-apps/api/core");
  URL.revokeObjectURL(objectUrl);

  return {
    storagePath: copied.relativePath,
    playbackUrl: convertFileSrc(abs),
    peaks,
    durationSec,
  };
}
