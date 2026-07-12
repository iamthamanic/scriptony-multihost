/**
 * Voicebox REST client — local AI voice studio (default TTS on desktop).
 * API: http://127.0.0.1:17493 (Voicebox app must be running).
 * Location: src/lib/api/voicebox-api.ts
 */

import { isDesktopShell } from "@/runtime/detect-runtime";
import { VOICEBOX_BASE_URL } from "@/lib/config/voice-engine";
import type { LoadingProgressReporter } from "@/lib/loading/global-loading-progress";
import { waitForVoiceboxReadyWithProgress } from "@/lib/voicebox/voicebox-loading-progress";
import type { VoiceEntry } from "./local-tts-api";

export interface VoiceboxProfile {
  id: string;
  name: string;
  language?: string | null;
  description?: string | null;
}

export interface VoiceboxGenerateResult {
  audioPath: string;
  durationMs?: number;
}

function baseUrl(): string {
  return VOICEBOX_BASE_URL.replace(/\/+$/, "");
}

function voiceboxUnavailableMessage(): string {
  return (
    "Voicebox ist nicht erreichbar. Bitte die Voicebox-App starten " +
    `(Standard: ${baseUrl()}).`
  );
}

export async function isVoiceboxHealthy(): Promise<boolean> {
  if (!isDesktopShell()) return false;
  try {
    const resp = await fetch(`${baseUrl()}/profiles`, { method: "GET" });
    return resp.ok;
  } catch {
    return false;
  }
}

function parseProfilesPayload(data: unknown): VoiceboxProfile[] {
  if (Array.isArray(data)) {
    return data.filter(isVoiceboxProfile);
  }
  if (data && typeof data === "object" && "profiles" in data) {
    const profiles = (data as { profiles?: unknown }).profiles;
    if (Array.isArray(profiles)) {
      return profiles.filter(isVoiceboxProfile);
    }
  }
  return [];
}

function isVoiceboxProfile(value: unknown): value is VoiceboxProfile {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "string" && typeof row.name === "string";
}

export async function listVoiceboxProfiles(): Promise<VoiceboxProfile[]> {
  if (!isDesktopShell()) return [];

  const resp = await fetch(`${baseUrl()}/profiles`, { method: "GET" });
  if (!resp.ok) {
    throw new Error(
      `Voicebox /profiles fehlgeschlagen (${resp.status}). ${voiceboxUnavailableMessage()}`,
    );
  }

  const data: unknown = await resp.json();
  return parseProfilesPayload(data);
}

/** Map Voicebox profiles to shared VoiceEntry shape for UI selectors. */
export function voiceboxProfilesAsVoiceEntries(
  profiles: VoiceboxProfile[],
): VoiceEntry[] {
  return profiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    lang: profile.language?.trim() || "de",
    gender: "profile",
  }));
}

async function saveVoiceboxWavToProject(
  projectDir: string,
  wavBytes: ArrayBuffer,
): Promise<string> {
  const { join } = await import("@tauri-apps/api/path");
  const { mkdir, writeFile } = await import("@tauri-apps/plugin-fs");
  const dir = await join(projectDir, ".scriptony", "voicebox-output");
  await mkdir(dir, { recursive: true });
  const fileName = `vb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.wav`;
  const filePath = await join(dir, fileName);
  await writeFile(filePath, new Uint8Array(wavBytes));
  return filePath;
}

function estimateDurationMsFromWav(bytes: ArrayBuffer): number | undefined {
  if (bytes.byteLength < 44) return undefined;
  const view = new DataView(bytes);
  const sampleRate = view.getUint32(24, true);
  const dataSize = view.getUint32(40, true);
  if (!sampleRate || !dataSize) return undefined;
  return Math.round((dataSize / (sampleRate * 2)) * 1000);
}

export async function generateVoiceboxSpeech(params: {
  text: string;
  profileId: string;
  language?: string;
  projectDir?: string;
}): Promise<VoiceboxGenerateResult> {
  if (!isDesktopShell()) {
    throw new Error("Voicebox TTS nur in der Desktop-App verfügbar.");
  }

  const profileId = params.profileId.trim();
  if (!profileId) {
    throw new Error("Voicebox profile_id fehlt.");
  }

  const resp = await fetch(`${baseUrl()}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: params.text,
      profile_id: profileId,
      language: params.language?.trim() || "de",
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(
      `Voicebox /generate fehlgeschlagen (${resp.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  const wavBytes = await resp.arrayBuffer();
  if (!wavBytes.byteLength) {
    throw new Error("Voicebox hat keine Audio-Daten zurückgegeben.");
  }

  if (!params.projectDir?.trim()) {
    throw new Error("Projektverzeichnis fehlt für Voicebox-Audio-Speicherung.");
  }

  const audioPath = await saveVoiceboxWavToProject(
    params.projectDir.trim(),
    wavBytes,
  );

  return {
    audioPath,
    durationMs: estimateDurationMsFromWav(wavBytes),
  };
}

export async function ensureVoiceboxSidecar(
  onProgress?: LoadingProgressReporter,
): Promise<void> {
  if (!isDesktopShell()) return;
  await waitForVoiceboxReadyWithProgress(onProgress);
}

export async function ensureVoiceboxAvailable(
  onProgress?: LoadingProgressReporter,
): Promise<void> {
  await ensureVoiceboxSidecar(onProgress);
}
