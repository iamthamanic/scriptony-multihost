/**
 * German UI hints for Voicebox /health model fields.
 * Location: src/lib/voicebox/voicebox-model-status.ts
 */

import { shouldHideVoiceboxModelLoadingHint } from "./voicebox-model-ready-signal";

export interface VoiceboxModelStatusInput {
  modelLoaded: boolean;
  modelDownloaded?: boolean | null;
}

export function voiceboxModelStatusHint(
  input: VoiceboxModelStatusInput,
): string | undefined {
  if (input.modelLoaded || shouldHideVoiceboxModelLoadingHint())
    return undefined;
  if (input.modelDownloaded === false) {
    return "TTS-Modell wird heruntergeladen — erste Generierung kann dauern.";
  }
  if (input.modelDownloaded === true) {
    return "TTS verbunden — TTS-Modell wird beim ersten Generate geladen.";
  }
  return "TTS verbunden — TTS-Modell noch nicht im RAM, erste Generierung kann dauern.";
}

export function voiceboxModelStatusShort(
  input: VoiceboxModelStatusInput,
): string {
  if (input.modelLoaded) return "TTS bereit";
  if (input.modelDownloaded === false) return "TTS-Modell-Download läuft";
  return "TTS-Modell lädt bei Generate";
}
