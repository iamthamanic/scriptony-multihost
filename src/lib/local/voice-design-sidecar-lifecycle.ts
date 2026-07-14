/**
 * Qwen VoiceDesign sidecar lifecycle — desktop only, port 3767.
 * Location: src/lib/local/voice-design-sidecar-lifecycle.ts
 */

import { invoke } from "@tauri-apps/api/core";
import { isDesktopShell } from "@/runtime/detect-runtime";

const VOICE_DESIGN_SIDECAR_TOKEN_KEY = "scriptony_voice_design_sidecar_token";

export function getVoiceDesignSidecarAuthToken(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(VOICE_DESIGN_SIDECAR_TOKEN_KEY);
}

export async function startVoiceDesignSidecar(): Promise<string> {
  if (!isDesktopShell()) {
    throw new Error("Qwen VoiceDesign ist nur in der Desktop-App verfügbar.");
  }
  const token = await invoke<string>("spawn_voice_design_sidecar");
  if (token && typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(VOICE_DESIGN_SIDECAR_TOKEN_KEY, token);
  }
  return token;
}

export async function stopVoiceDesignSidecar(): Promise<void> {
  if (!isDesktopShell()) return;
  try {
    await invoke("stop_voice_design_sidecar");
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(VOICE_DESIGN_SIDECAR_TOKEN_KEY);
    }
  } catch {
    /* ignore */
  }
}

export async function voiceDesignSidecarHealth(): Promise<boolean> {
  if (!isDesktopShell()) return false;
  try {
    return await invoke<boolean>("voice_design_sidecar_health");
  } catch {
    return false;
  }
}

const STARTUP_POLL_MS = 200;
const STARTUP_MAX_ATTEMPTS = 25;

/** Ensure sidecar responds on /health; start via Tauri if needed. */
export async function ensureVoiceDesignSidecarReady(): Promise<void> {
  if (!(await voiceDesignSidecarHealth())) {
    await startVoiceDesignSidecar();
  }
  for (let attempt = 0; attempt < STARTUP_MAX_ATTEMPTS; attempt += 1) {
    if (await voiceDesignSidecarHealth()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, STARTUP_POLL_MS));
  }
  throw new Error(
    "Qwen VoiceDesign Sidecar nicht erreichbar — bitte Sidecar starten oder die Desktop-App neu laden.",
  );
}
