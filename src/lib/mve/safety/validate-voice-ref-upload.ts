/**
 * Validate voice reference uploads for cloning (format + MVP duration bounds).
 * Location: src/lib/mve/safety/validate-voice-ref-upload.ts
 */

import { decodeAudioFileToPeaks } from "@/lib/timeline-add-audio";

const ALLOWED_MIME = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mpeg",
  "audio/mp3",
]);

const ALLOWED_EXT = /\.(wav|mp3)$/i;

/** MVP: 30 seconds to 5 minutes (PRD clone reference). */
export const VOICE_REF_MIN_SEC = 30;
export const VOICE_REF_MAX_SEC = 5 * 60;

export interface ValidatedVoiceRefUpload {
  durationSec: number;
}

export async function validateVoiceRefUpload(
  file: File,
): Promise<ValidatedVoiceRefUpload> {
  const mimeOk = file.type ? ALLOWED_MIME.has(file.type) : false;
  const extOk = ALLOWED_EXT.test(file.name);
  if (!mimeOk && !extOk) {
    throw new Error("Nur WAV- oder MP3-Dateien sind erlaubt.");
  }

  if (file.size > 80 * 1024 * 1024) {
    throw new Error("Datei ist zu groß (max. 80 MB).");
  }

  const { durationSec, objectUrl } = await decodeAudioFileToPeaks(file);
  URL.revokeObjectURL(objectUrl);

  if (durationSec < VOICE_REF_MIN_SEC) {
    throw new Error(
      `Referenz-Audio zu kurz (min. ${VOICE_REF_MIN_SEC} Sekunden).`,
    );
  }
  if (durationSec > VOICE_REF_MAX_SEC) {
    throw new Error(
      `Referenz-Audio zu lang (max. ${VOICE_REF_MAX_SEC / 60} Minuten).`,
    );
  }

  return { durationSec };
}
