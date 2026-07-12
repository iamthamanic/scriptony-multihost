/**
 * Resolve absolute local audio paths to WebView-playable URLs (Tauri).
 * Falls back to blob: URLs when asset protocol scope blocks convertFileSrc.
 *
 * Location: src/lib/local-audio-playback-url.ts
 */

import { isAbsoluteFilesystemPath } from "@/lib/local-asset-display-url";
import { isDesktopShell } from "@/runtime/detect-runtime";

function audioMimeForPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "flac") return "audio/flac";
  if (ext === "ogg") return "audio/ogg";
  return "audio/wav";
}

async function readLocalAudioAsBlobUrl(absPath: string): Promise<string> {
  const { readFile } = await import("@tauri-apps/plugin-fs");
  const bytes = await readFile(absPath);
  const blob = new Blob([bytes], { type: audioMimeForPath(absPath) });
  return URL.createObjectURL(blob);
}

/** Playable URL for an absolute audio file on disk (desktop). */
export async function resolveLocalAudioPlaybackUrl(
  absPath: string,
): Promise<string> {
  if (!absPath.trim()) {
    throw new Error("Audio-Pfad fehlt.");
  }
  if (!isDesktopShell()) {
    throw new Error("Lokale Audio-Wiedergabe nur in der Desktop-App.");
  }

  const { convertFileSrc } = await import("@tauri-apps/api/core");
  const converted = convertFileSrc(absPath);
  if (!isAbsoluteFilesystemPath(converted)) {
    return converted;
  }

  return readLocalAudioAsBlobUrl(absPath);
}
