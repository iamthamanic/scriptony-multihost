/**
 * ElevenLabs REST client — direct API (no Appwrite cloud TTS).
 * Location: src/lib/api/elevenlabs-api.ts
 */

import { getElevenLabsApiKey } from "@/lib/config/voice-providers";
import type { VoiceEntry } from "./voice-entry";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

function requireElevenLabsKey(): string {
  const key = getElevenLabsApiKey();
  if (!key) {
    throw new Error(
      "ElevenLabs API-Key fehlt. Setze VITE_ELEVENLABS_API_KEY in .env.local.",
    );
  }
  return key;
}

export async function listElevenLabsVoices(): Promise<VoiceEntry[]> {
  const resp = await fetch(`${ELEVENLABS_BASE}/voices`, {
    headers: { "xi-api-key": requireElevenLabsKey() },
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(
      `ElevenLabs Stimmen (${resp.status})${detail ? `: ${detail}` : ""}`,
    );
  }
  const data = (await resp.json()) as {
    voices?: Array<{
      voice_id: string;
      name: string;
      labels?: Record<string, string>;
    }>;
  };
  return (data.voices ?? []).map((voice) => ({
    id: voice.voice_id,
    name: voice.name,
    lang: voice.labels?.language?.trim() || "de",
    gender: voice.labels?.gender?.trim() || "voice",
  }));
}

export async function synthesizeElevenLabsSpeech(params: {
  text: string;
  voiceId: string;
  speed?: number;
}): Promise<ArrayBuffer> {
  const voiceId = params.voiceId.trim();
  if (!voiceId) throw new Error("ElevenLabs voice_id fehlt.");

  const resp = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": requireElevenLabsKey(),
    },
    body: JSON.stringify({
      text: params.text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0,
        use_speaker_boost: true,
        speed: params.speed ?? 1,
      },
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(
      `ElevenLabs TTS (${resp.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  const bytes = await resp.arrayBuffer();
  if (!bytes.byteLength) {
    throw new Error("ElevenLabs hat keine Audio-Daten zurückgegeben.");
  }
  return bytes;
}
