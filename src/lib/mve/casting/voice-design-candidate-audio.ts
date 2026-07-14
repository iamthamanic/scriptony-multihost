/**
 * Resolve Qwen VoiceDesign candidate audio URLs for playback.
 * Location: src/lib/mve/casting/voice-design-candidate-audio.ts
 */

import { getQwenVoiceDesignSidecarBaseUrl } from "@/lib/env";
import { getVoiceDesignSidecarAuthToken } from "@/lib/local/voice-design-sidecar-lifecycle";

const LOCAL_AUDIO_PREFIX = "local://voice-design/sessions/";

export function voiceDesignCandidateAudioHttpUrl(audioUrl: string): string {
  const trimmed = audioUrl.trim();
  if (!trimmed.startsWith(LOCAL_AUDIO_PREFIX)) {
    throw new Error("Unbekanntes Voice-Design-Audio-Format.");
  }
  const relative = trimmed.slice(LOCAL_AUDIO_PREFIX.length);
  return `${getQwenVoiceDesignSidecarBaseUrl()}/voice-design/sessions/${relative}`;
}

/** Fetch sidecar candidate WAV and return a blob: URL for inline playback. */
export async function fetchVoiceDesignCandidatePlaybackUrl(
  audioUrl: string,
): Promise<string> {
  const httpUrl = voiceDesignCandidateAudioHttpUrl(audioUrl);
  const token = getVoiceDesignSidecarAuthToken();
  if (!token) {
    throw new Error(
      "Qwen VoiceDesign Sidecar nicht authentifiziert — bitte Sidecar starten.",
    );
  }

  const response = await fetch(httpUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("Kandidaten-Audio konnte nicht geladen werden.");
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
