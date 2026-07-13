/**
 * Default local TTS engine for desktop (MVE + legacy scene TTS).
 * Kokoro runs only inside Voicebox — no standalone sidecar.
 * Location: src/lib/config/voice-engine.ts
 */

export type LocalVoiceEngineId = "voicebox" | "kokoro" | "elevenlabs";

/** Active local TTS engine — always Voicebox on desktop. */
export const DEFAULT_VOICE_ENGINE: LocalVoiceEngineId = "voicebox";

/** Same-origin Vite dev proxy — Voicebox CORS allows tauri.localhost, not localhost:3000. */
export const VOICEBOX_DEV_PROXY_PATH = "/__voicebox";

export function resolveVoiceboxDirectUrl(envUrl?: string): string {
  return envUrl?.trim() || "http://127.0.0.1:17493";
}

export function resolveVoiceboxBaseUrl(options: {
  isDev: boolean;
  envUrl?: string;
}): string {
  return options.isDev
    ? VOICEBOX_DEV_PROXY_PATH
    : resolveVoiceboxDirectUrl(options.envUrl);
}

export const VOICEBOX_BASE_URL = resolveVoiceboxBaseUrl({
  isDev: import.meta.env.DEV,
  envUrl: import.meta.env.VITE_VOICEBOX_BASE_URL,
});

export function isVoiceboxDefault(): boolean {
  return true;
}

export function localVoiceEngineLabel(engine: LocalVoiceEngineId): string {
  if (engine === "elevenlabs") return "ElevenLabs";
  if (engine === "kokoro") return "Kokoro";
  return "Voicebox";
}

/** User-facing label — Voicebox runs headless; settings live in Scriptony. */
export function localVoiceEngineUserLabel(engine: LocalVoiceEngineId): string {
  if (engine === "elevenlabs") return "ElevenLabs";
  if (engine === "kokoro") return "Kokoro";
  return "Voicebox";
}

/** Legacy SQLite rows may still store engine=kokoro — show Kokoro provider. */
export function resolveVoiceEngineId(
  engine: string | undefined | null,
): LocalVoiceEngineId {
  if (engine === "elevenlabs") return "elevenlabs";
  if (engine === "kokoro") return "kokoro";
  return "voicebox";
}

/** Voicebox HTTP TTS (all local providers except ElevenLabs). */
export function usesVoiceboxSidecar(engine: LocalVoiceEngineId): boolean {
  return engine === "voicebox" || engine === "kokoro";
}
