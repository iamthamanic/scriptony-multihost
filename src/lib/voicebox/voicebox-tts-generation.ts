/**
 * Voicebox TTS generation timeouts and user-facing progress copy.
 * Location: src/lib/voicebox/voicebox-tts-generation.ts
 */

export const VOICEBOX_GENERATION_POLL_MS = 500;
/** Per-attempt ceiling — cold Qwen load can exceed 2 minutes on first generate. */
export const VOICEBOX_GENERATION_TIMEOUT_MS = 300_000;
export const VOICEBOX_GENERATION_MAX_ATTEMPTS = 2;

export class VoiceboxGenerationTimeoutError extends Error {
  readonly modelLikelyCold: boolean;

  constructor(modelLikelyCold: boolean, finalAttempt: boolean) {
    super(voiceboxGenerationTimeoutMessage(modelLikelyCold, finalAttempt));
    this.name = "VoiceboxGenerationTimeoutError";
    this.modelLikelyCold = modelLikelyCold;
  }
}

export function voiceboxGenerationProgressMessage(
  elapsedMs: number,
  modelLikelyCold: boolean,
): string {
  if (elapsedMs < 15_000) {
    return "TTS wird generiert…";
  }
  if (elapsedMs < 60_000) {
    return modelLikelyCold
      ? "TTS-Modell wird geladen — erste Generierung kann dauern…"
      : "TTS wird generiert…";
  }
  if (elapsedMs < 120_000) {
    return "TTS-Generierung läuft noch — bitte warten…";
  }
  return "TTS-Modell lädt noch — bei Kaltstart kann das mehrere Minuten dauern…";
}

export function voiceboxGenerationTimeoutMessage(
  modelLikelyCold: boolean,
  finalAttempt: boolean,
): string {
  if (!finalAttempt) {
    return "TTS dauert länger als erwartet — Scriptony versucht es erneut…";
  }
  if (modelLikelyCold) {
    return (
      "TTS-Modell wurde nicht rechtzeitig geladen — Voicebox offen lassen, " +
      "1–2 Minuten warten und erneut versuchen."
    );
  }
  return "Voicebox TTS Zeitüberschreitung — bitte erneut versuchen.";
}

export function isVoiceboxGenerationTimeoutError(
  error: unknown,
): error is VoiceboxGenerationTimeoutError {
  return error instanceof VoiceboxGenerationTimeoutError;
}
