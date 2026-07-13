/**
 * Read persisted voice reference audio from project assets (clone upload).
 * Location: src/lib/mve/safety/read-voice-ref-audio.ts
 */

import { requireLocalBackend } from "@/lib/api-adapter/runtime-dispatch";

export async function readVoiceRefAudioFromProject(
  relativePath: string,
): Promise<{
  bytes: Uint8Array;
  fileName: string;
}> {
  const path = relativePath.trim();
  if (!path) {
    throw new Error("Referenz-Audio-Pfad fehlt.");
  }

  const backend = requireLocalBackend();
  const { join } = await import("@tauri-apps/api/path");
  const { readFile } = await import("@tauri-apps/plugin-fs");

  const absPath = await join(backend.localProject.dirPath, path);
  const bytes = await readFile(absPath);
  const fileName = path.split("/").pop() || "voice-ref.wav";

  return { bytes, fileName };
}
