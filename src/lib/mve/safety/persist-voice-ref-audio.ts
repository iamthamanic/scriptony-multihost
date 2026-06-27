/**
 * Persist voice reference audio under .scriptony/assets/voice-refs/ (local only).
 * Location: src/lib/mve/safety/persist-voice-ref-audio.ts
 */

import { LocalStorageService } from "@/backend/local/LocalStorageService";
import {
  isLocalProfile,
  requireLocalBackend,
} from "@/lib/api-adapter/runtime-dispatch";
import { validateVoiceRefUpload } from "./validate-voice-ref-upload";

export async function persistVoiceRefAudio(file: File): Promise<{
  relativePath: string;
  durationSec: number;
}> {
  const { durationSec } = await validateVoiceRefUpload(file);

  if (!isLocalProfile()) {
    throw new Error(
      "Voice-Referenz-Upload ist nur im lokalen Desktop-Projekt verfügbar.",
    );
  }

  const backend = requireLocalBackend();
  const storage = new LocalStorageService(backend.localProject.dirPath);
  const copied = await storage.copyIntoProjectAssets(file, "voice_ref");

  return {
    relativePath: copied.relativePath,
    durationSec,
  };
}
