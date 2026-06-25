/**
 * Local TTS API Client — direkte Kommunikation mit Kokoro Sidecar.
 *
 * Desktop: HTTP nur über Tauri invoke (WebView-CSP-sicher), nicht fetch als Gate.
 *
 * Location: src/lib/api/local-tts-api.ts
 */

import { isDesktopShell } from "@/runtime/detect-runtime";
import { invoke } from "@tauri-apps/api/core";
import type { KokoroProgressReporter } from "@/lib/kokoro/kokoro-loading-progress";
import { waitForKokoroReadyWithProgress } from "@/lib/kokoro/kokoro-loading-progress";
import { KOKORO_VOICE_CATALOG } from "./kokoro-voice-catalog";

const KOKORO_PORT = 8080;

function kokoroBaseUrl(): string {
  return `http://127.0.0.1:${KOKORO_PORT}`;
}

async function kokoroServerHealth(): Promise<boolean> {
  if (!isDesktopShell()) return false;
  try {
    return await invoke<boolean>("kokoro_server_health");
  } catch {
    return false;
  }
}

/**
 * Start Kokoro sidecar via Tauri command (if not already running).
 */
export async function ensureKokoroSidecar(
  projectDir: string,
  onProgress?: KokoroProgressReporter,
): Promise<void> {
  if (!isDesktopShell()) return;
  await waitForKokoroReadyWithProgress(projectDir, onProgress);
}

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

export interface ListLocalVoicesResult {
  voices: VoiceEntry[];
  /** Sidecar HTTP reachable */
  sidecarReady: boolean;
  /** Kokoro TTS engine loaded and ready to synthesize */
  kokoroReady: boolean;
  /** Error from /status when phase=error */
  kokoroError?: string;
  /** Used built-in catalog because sidecar list failed */
  usedCatalogFallback: boolean;
}

async function getKokoroServerStatus(): Promise<{
  kokoroReady: boolean;
  message?: string;
  phase?: string;
} | null> {
  if (!isDesktopShell()) return null;
  try {
    return await invoke<{
      kokoroReady: boolean;
      message: string;
      phase: string;
    } | null>("kokoro_server_status");
  } catch {
    return null;
  }
}

/**
 * Fetch Kokoro voices — ensures sidecar when projectDir given.
 */
export async function listLocalVoices(
  projectDir?: string,
  onProgress?: KokoroProgressReporter,
): Promise<ListLocalVoicesResult> {
  if (!isDesktopShell()) {
    return {
      voices: [],
      sidecarReady: false,
      kokoroReady: false,
      usedCatalogFallback: false,
    };
  }

  if (projectDir) {
    try {
      await ensureKokoroSidecar(projectDir, onProgress);
    } catch (err) {
      console.warn("[local-tts] ensureKokoroSidecar failed:", err);
    }
  }

  const sidecarReady = await kokoroServerHealth();
  const status = sidecarReady ? await getKokoroServerStatus() : null;
  const kokoroReady = status?.kokoroReady ?? false;
  const kokoroError = status?.phase === "error" ? status.message : undefined;

  if (sidecarReady) {
    try {
      const viaTauri = await invoke<VoiceEntry[]>("list_kokoro_voices");
      if (Array.isArray(viaTauri) && viaTauri.length > 0) {
        return {
          voices: viaTauri,
          sidecarReady: true,
          kokoroReady,
          kokoroError,
          usedCatalogFallback: false,
        };
      }
    } catch (err) {
      console.warn("[local-tts] list_kokoro_voices failed:", err);
    }

    try {
      const resp = await fetch(`${kokoroBaseUrl()}/voices`, { method: "GET" });
      if (resp.ok) {
        const data = (await resp.json()) as { voices: VoiceEntry[] };
        if (data.voices?.length) {
          return {
            voices: data.voices,
            sidecarReady: true,
            kokoroReady,
            kokoroError,
            usedCatalogFallback: false,
          };
        }
      }
    } catch (err) {
      console.warn("[local-tts] fetch /voices failed:", err);
    }
  }

  return {
    voices: KOKORO_VOICE_CATALOG,
    sidecarReady,
    kokoroReady,
    kokoroError,
    usedCatalogFallback: true,
  };
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

export async function synthesizeLocal(
  payload: LocalTtsPayload,
  onProgress?: KokoroProgressReporter,
): Promise<LocalTtsResponse> {
  if (!(await kokoroServerHealth())) {
    throw new Error(
      "Kokoro-Server läuft nicht. Beim ersten Start kann die Python-Einrichtung einige Minuten dauern (tools/kokoro-server).",
    );
  }

  onProgress?.({
    percent: 90,
    message: "Text wird synthetisiert…",
    phase: "synthesizing",
  });

  if (isDesktopShell()) {
    try {
      return await invoke<LocalTtsResponse>("synthesize_kokoro", {
        text: payload.text,
        voice: payload.voice,
        speed: payload.speed ?? 1.0,
        format: payload.format ?? "wav",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const error = new Error(`Kokoro TTS failed: ${message}`);
      Object.assign(error, { cause: err });
      throw error;
    }
  }

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

  return (await resp.json()) as LocalTtsResponse;
}

export async function isKokoroHealthy(): Promise<boolean> {
  return kokoroServerHealth();
}
