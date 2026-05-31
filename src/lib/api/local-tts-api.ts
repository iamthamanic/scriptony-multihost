/**
 * Local TTS API Client — direkte Kommunikation mit Kokoro Sidecar.
 *
 * T31: Lokale TTS ohne Cloud-API.
 * - synthesizeLocal: POST /synthesize -> WAV
 * - listLocalVoices: GET /voices -> Voice[]
 * - healthLocal: GET /health -> { status, kokoro_ready }
 *
 * Location: src/lib/api/local-tts-api.ts
 */

import { isDesktopShell } from "@/runtime/detect-runtime";
import { invoke } from "@tauri-apps/api/core";

const KOKORO_PORT = 8080; // muss mit Rust sidecar_port() uebereinstimmen

function kokoroBaseUrl(): string {
  return `http://127.0.0.1:${KOKORO_PORT}`;
}

/**
 * Start Kokoro sidecar via Tauri command (if not already running).
 */
export async function ensureKokoroSidecar(projectDir: string): Promise<void> {
  if (!isDesktopShell()) return;
  const health = await invoke<boolean>("kokoro_health");
  if (!health) {
    await invoke<string>("start_kokoro_sidecar", { projectDir });
    // Warte kurz auf Server-Start
    await new Promise((r) => setTimeout(r, 1500));
  }
}

/**
 * Stop Kokoro sidecar.
 */
export async function stopKokoroSidecar(): Promise<void> {
  if (!isDesktopShell()) return;
  await invoke("stop_kokoro_sidecar");
}

export interface VoiceEntry {
  id: string;
  name: string;
  lang: string;
  gender: string;
}

/**
 * Fetch available voices from local Kokoro server.
 */
export async function listLocalVoices(): Promise<VoiceEntry[]> {
  if (!isDesktopShell()) return [];
  try {
    const resp = await fetch(`${kokoroBaseUrl()}/voices`, {
      method: "GET",
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = (await resp.json()) as { voices: VoiceEntry[] };
    return data.voices ?? [];
  } catch {
    return [];
  }
}

export interface LocalTtsPayload {
  text: string;
  voice: string;
  speed?: number;
  format?: "wav" | "mp3" | "flac";
}

export interface LocalTtsResponse {
  audioPath: string;
  duration: number;
  format: string;
}

/**
 * Synthesize text to speech via local Kokoro server.
 * Returns the absolute path to the generated audio file.
 */
export async function synthesizeLocal(
  payload: LocalTtsPayload,
): Promise<LocalTtsResponse> {
  const resp = await fetch(`${kokoroBaseUrl()}/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: payload.text,
      voice: payload.voice,
      speed: payload.speed ?? 1.0,
      format: payload.format ?? "wav",
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Kokoro TTS failed: ${resp.status} — ${err}`);
  }

  const data = (await resp.json()) as LocalTtsResponse;
  return data;
}

/**
 * Check if local Kokoro server is healthy.
 */
export async function isKokoroHealthy(): Promise<boolean> {
  if (!isDesktopShell()) return false;
  try {
    const resp = await fetch(`${kokoroBaseUrl()}/health`, { method: "GET" });
    if (!resp.ok) return false;
    const data = (await resp.json()) as { kokoro_ready?: boolean };
    return data.kokoro_ready ?? false;
  } catch {
    return false;
  }
}
