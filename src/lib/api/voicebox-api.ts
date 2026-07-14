/**
 * Voicebox REST client — local AI voice studio (default TTS on desktop).
 * API: http://127.0.0.1:17493 (Voicebox app must be running).
 * Location: src/lib/api/voicebox-api.ts
 */

import { isDesktopShell } from "@/runtime/detect-runtime";
import { VOICE_DESIGN_DESCRIPTION_MAX_LENGTH } from "@/lib/mve/casting/voice-design-field-help";
import { markVoiceboxTtsSucceeded } from "@/lib/voicebox/voicebox-model-ready-signal";
import {
  isVoiceboxGenerationTimeoutError,
  VOICEBOX_GENERATION_MAX_ATTEMPTS,
  VOICEBOX_GENERATION_POLL_MS,
  VOICEBOX_GENERATION_TIMEOUT_MS,
  VoiceboxGenerationTimeoutError,
  voiceboxGenerationProgressMessage,
} from "@/lib/voicebox/voicebox-tts-generation";
import { VOICEBOX_BASE_URL } from "@/lib/config/voice-engine";
import type { LoadingProgressReporter } from "@/lib/loading/global-loading-progress";
import { waitForVoiceboxReadyWithProgress } from "@/lib/voicebox/voicebox-loading-progress";
import {
  ensureVoiceboxScriptonyIntegration,
  VOICEBOX_SCRIPTONY_CLIENT_ID,
} from "@/lib/voicebox/voicebox-scriptony-integration";
import type { VoiceEntry } from "./voice-entry";

import {
  VOICEBOX_PRESET_ENGINES,
  VOICEBOX_PROVIDER_PRESET_ENGINES,
  KOKORO_PRESET_ENGINE,
  voiceboxPresetEngineLabel,
  type VoiceboxPresetEngine,
} from "@/lib/config/voicebox-preset-engines";

export {
  VOICEBOX_PRESET_ENGINES,
  VOICEBOX_PROVIDER_PRESET_ENGINES,
  KOKORO_PRESET_ENGINE,
  voiceboxPresetEngineLabel,
  type VoiceboxPresetEngine,
};

const PRESET_ID_PREFIX = "preset:";

export function presetVoiceEntryId(engine: string, voiceId: string): string {
  return `${PRESET_ID_PREFIX}${engine}:${voiceId}`;
}

export function isPresetVoiceEntryId(id: string): boolean {
  return id.startsWith(PRESET_ID_PREFIX);
}

export function parsePresetVoiceEntryId(
  id: string,
): { engine: string; voiceId: string } | null {
  if (!isPresetVoiceEntryId(id)) return null;
  const rest = id.slice(PRESET_ID_PREFIX.length);
  const sep = rest.indexOf(":");
  if (sep <= 0) return null;
  return {
    engine: rest.slice(0, sep),
    voiceId: rest.slice(sep + 1),
  };
}

export interface VoiceboxProfile {
  id: string;
  name: string;
  language?: string | null;
  description?: string | null;
  default_engine?: string | null;
  preset_engine?: string | null;
  voice_type?: string | null;
}

export interface VoiceboxHealth {
  status: string;
  model_loaded: boolean;
  model_downloaded?: boolean | null;
  gpu_available: boolean;
}

export interface VoiceboxGenerateResult {
  audioPath: string;
  durationMs?: number;
}

interface VoiceboxGenerationRecord {
  id: string;
  status: string;
  audio_path?: string | null;
  duration?: number | null;
  error?: string | null;
  engine?: string | null;
}

const GENERATION_POLL_MS = VOICEBOX_GENERATION_POLL_MS;
const GENERATION_TIMEOUT_MS = VOICEBOX_GENERATION_TIMEOUT_MS;

export {
  VOICEBOX_GENERATION_POLL_MS,
  VOICEBOX_GENERATION_TIMEOUT_MS,
  VOICEBOX_GENERATION_MAX_ATTEMPTS,
} from "@/lib/voicebox/voicebox-tts-generation";

function baseUrl(): string {
  return VOICEBOX_BASE_URL.replace(/\/+$/, "");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function voiceboxUnavailableMessage(): string {
  return (
    "Lokaler TTS-Dienst ist nicht erreichbar. " +
    "Scriptony startet ihn automatisch im Hintergrund."
  );
}

function isVoiceboxProfile(value: unknown): value is VoiceboxProfile {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "string" && typeof row.name === "string";
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

function resolveEngineForProfile(
  profile: VoiceboxProfile | null,
): string | undefined {
  const engine =
    profile?.default_engine?.trim() ||
    profile?.preset_engine?.trim() ||
    undefined;
  return engine || undefined;
}

export async function getVoiceboxHealth(): Promise<VoiceboxHealth | null> {
  if (!isDesktopShell()) return null;
  try {
    const resp = await fetch(`${baseUrl()}/health`, { method: "GET" });
    if (!resp.ok) return null;
    const data: unknown = await resp.json();
    if (!data || typeof data !== "object") return null;
    const row = data as Record<string, unknown>;
    if (typeof row.status !== "string") return null;
    return {
      status: row.status,
      model_loaded: Boolean(row.model_loaded),
      model_downloaded:
        typeof row.model_downloaded === "boolean" ? row.model_downloaded : null,
      gpu_available: Boolean(row.gpu_available),
    };
  } catch {
    return null;
  }
}

export async function isVoiceboxHealthy(): Promise<boolean> {
  const health = await getVoiceboxHealth();
  if (health?.status === "healthy") return true;
  if (!isDesktopShell()) return false;
  try {
    const resp = await fetch(`${baseUrl()}/profiles`, { method: "GET" });
    return resp.ok;
  } catch {
    return false;
  }
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

export async function getVoiceboxProfile(
  profileId: string,
): Promise<VoiceboxProfile | null> {
  const id = profileId.trim();
  if (!id) return null;
  const profiles = await listVoiceboxProfiles();
  return profiles.find((p) => p.id === id) ?? null;
}

export interface CreateVoiceboxProfileInput {
  name: string;
  description?: string;
  language?: string;
  voiceType?: "cloned" | "preset" | "designed";
}

export interface CreateDesignedVoiceboxProfileInput {
  name: string;
  designPrompt: string;
  language?: string;
  description?: string;
  personality?: string;
  defaultEngine?: string;
}

/** Create a designed (prompt-to-voice) profile via Voicebox API. */
export async function createDesignedVoiceboxProfile(
  input: CreateDesignedVoiceboxProfileInput,
): Promise<VoiceboxProfile> {
  if (!isDesktopShell()) {
    throw new Error("Stimmen können nur in der Desktop-App angelegt werden.");
  }

  const name = input.name.trim();
  const designPrompt = input.designPrompt
    .trim()
    .slice(0, VOICE_DESIGN_DESCRIPTION_MAX_LENGTH);
  if (!name) {
    throw new Error("Stimmenname fehlt.");
  }
  if (!designPrompt) {
    throw new Error("Design-Prompt fehlt.");
  }

  const body: Record<string, string> = {
    name,
    voice_type: "designed",
    design_prompt: designPrompt,
    default_engine: input.defaultEngine?.trim() || "qwen_custom_voice",
    language: input.language?.trim() || "de",
  };
  if (input.description?.trim()) {
    body.description = input.description.trim();
  }
  if (input.personality?.trim()) {
    body.personality = input.personality.trim();
  }

  const resp = await fetch(`${baseUrl()}/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    if (resp.status === 422 && detail.includes("design_prompt")) {
      throw new Error(
        `Design-Prompt zu lang (max. ${VOICE_DESIGN_DESCRIPTION_MAX_LENGTH} Zeichen). Bitte Beschreibung kürzen.`,
      );
    }
    throw new Error(
      `Designed-Stimme konnte nicht erzeugt werden (${resp.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  const data: unknown = await resp.json();
  if (!isVoiceboxProfile(data)) {
    throw new Error("Ungültige Antwort beim Erzeugen der Stimme.");
  }
  return data;
}

/** Update an existing Voicebox profile (rename, design_prompt, etc.). */
export async function updateVoiceboxProfile(
  profileId: string,
  patch: {
    name?: string;
    description?: string;
    designPrompt?: string;
    language?: string;
  },
): Promise<VoiceboxProfile> {
  if (!isDesktopShell()) {
    throw new Error("Stimmen können nur in der Desktop-App bearbeitet werden.");
  }

  const id = profileId.trim();
  if (!id) throw new Error("Voicebox profile_id fehlt.");

  const body: Record<string, string> = {};
  if (patch.name?.trim()) body.name = patch.name.trim();
  if (patch.description?.trim()) body.description = patch.description.trim();
  if (patch.designPrompt?.trim())
    body.design_prompt = patch.designPrompt.trim();
  if (patch.language?.trim()) body.language = patch.language.trim();

  const resp = await fetch(`${baseUrl()}/profiles/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(
      `Stimme konnte nicht aktualisiert werden (${resp.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  const data: unknown = await resp.json();
  if (!isVoiceboxProfile(data)) {
    throw new Error("Ungültige Antwort beim Aktualisieren der Stimme.");
  }
  return data;
}

/** Delete a Voicebox profile (cleanup preview candidates). */
export async function deleteVoiceboxProfile(profileId: string): Promise<void> {
  if (!isDesktopShell()) return;

  const id = profileId.trim();
  if (!id) return;

  const resp = await fetch(`${baseUrl()}/profiles/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!resp.ok && resp.status !== 404) {
    const detail = await resp.text().catch(() => "");
    throw new Error(
      `Stimme konnte nicht gelöscht werden (${resp.status})${detail ? `: ${detail}` : ""}`,
    );
  }
}

/** Create a voice profile via Voicebox API (Scriptony UI — user never opens Voicebox). */
export async function createVoiceboxProfile(
  input: CreateVoiceboxProfileInput,
): Promise<VoiceboxProfile> {
  if (!isDesktopShell()) {
    throw new Error("Stimmen können nur in der Desktop-App angelegt werden.");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Stimmenname fehlt.");
  }

  const body: Record<string, string> = { name };
  if (input.description?.trim()) {
    body.description = input.description.trim();
  }
  if (input.language?.trim()) {
    body.language = input.language.trim();
  }
  if (input.voiceType) {
    body.voice_type = input.voiceType;
  }

  const resp = await fetch(`${baseUrl()}/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(
      `Stimme konnte nicht angelegt werden (${resp.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  const data: unknown = await resp.json();
  if (!isVoiceboxProfile(data)) {
    throw new Error("Ungültige Antwort beim Anlegen der Stimme.");
  }
  return data;
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
    isPreset: false,
  }));
}

function presetEngineLabel(engine: string): string {
  return voiceboxPresetEngineLabel(engine);
}

export async function listVoiceboxPresetVoices(
  engine: VoiceboxPresetEngine,
): Promise<VoiceEntry[]> {
  if (!isDesktopShell()) return [];

  const resp = await fetch(
    `${baseUrl()}/profiles/presets/${encodeURIComponent(engine)}`,
    { method: "GET" },
  );
  if (!resp.ok) {
    return [];
  }

  const data = (await resp.json()) as {
    voices?: Array<{ id?: string; voice_id?: string; name?: string }>;
  };
  const label = presetEngineLabel(engine);
  return (data.voices ?? [])
    .map((voice): VoiceEntry | null => {
      const voiceId = voice.id?.trim() || voice.voice_id?.trim();
      const name = voice.name?.trim();
      if (!voiceId || !name) return null;
      return {
        id: presetVoiceEntryId(engine, voiceId),
        name: `${label} — ${name}`,
        lang: "de",
        gender: "preset",
        presetEngine: engine,
        isPreset: true,
      };
    })
    .filter((entry): entry is VoiceEntry => entry !== null);
}

async function mergeProfilesWithPresets(
  profiles: VoiceEntry[],
  presetEngines: readonly VoiceboxPresetEngine[],
): Promise<VoiceEntry[]> {
  const presetGroups = await Promise.all(
    presetEngines.map((engine) => listVoiceboxPresetVoices(engine)),
  );
  const presets = presetGroups.flat();
  const profileIds = new Set(profiles.map((p) => p.id));
  const dedupedPresets = presets.filter((p) => !profileIds.has(p.id));
  return [...profiles, ...dedupedPresets];
}

/** Voicebox provider: user profiles only (Eigene Stimmen). */
export async function listVoiceboxUserProfileEntries(): Promise<VoiceEntry[]> {
  return voiceboxProfilesAsVoiceEntries(await listVoiceboxProfiles());
}

/** @deprecated Use listVoiceboxUserProfileEntries + per-preset providers in UI. */
export async function listVoiceboxProviderVoiceEntries(): Promise<
  VoiceEntry[]
> {
  const profiles = await listVoiceboxUserProfileEntries();
  return mergeProfilesWithPresets(profiles, VOICEBOX_PROVIDER_PRESET_ENGINES);
}

/** Kokoro provider: Kokoro presets only. */
export async function listKokoroPresetVoiceEntries(): Promise<VoiceEntry[]> {
  return listVoiceboxPresetVoices(KOKORO_PRESET_ENGINE);
}

/** User profiles + all built-in presets — legacy combined list. */
export async function listVoiceboxVoiceEntries(): Promise<VoiceEntry[]> {
  const profiles = voiceboxProfilesAsVoiceEntries(await listVoiceboxProfiles());
  return mergeProfilesWithPresets(profiles, VOICEBOX_PRESET_ENGINES);
}

export interface CreateVoiceboxPresetProfileInput {
  name: string;
  presetEngine: string;
  presetVoiceId: string;
  language?: string;
  description?: string;
}

export async function createVoiceboxPresetProfile(
  input: CreateVoiceboxPresetProfileInput,
): Promise<VoiceboxProfile> {
  if (!isDesktopShell()) {
    throw new Error("Stimmen können nur in der Desktop-App angelegt werden.");
  }

  const name = input.name.trim();
  const presetEngine = input.presetEngine.trim();
  const presetVoiceId = input.presetVoiceId.trim();
  if (!name || !presetEngine || !presetVoiceId) {
    throw new Error("Preset-Stimme unvollständig.");
  }

  const body: Record<string, string> = {
    name,
    voice_type: "preset",
    preset_engine: presetEngine,
    preset_voice_id: presetVoiceId,
    default_engine: presetEngine,
  };
  if (input.description?.trim()) body.description = input.description.trim();
  if (input.language?.trim()) body.language = input.language.trim();

  const resp = await fetch(`${baseUrl()}/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(
      `Preset-Stimme konnte nicht angelegt werden (${resp.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  const data: unknown = await resp.json();
  if (!isVoiceboxProfile(data)) {
    throw new Error("Ungültige Antwort beim Anlegen der Preset-Stimme.");
  }
  return data;
}

/** Resolve UI voice id (profile uuid or preset:engine:voice) to a Voicebox profile id. */
export async function resolveVoiceboxProfileIdForSelection(params: {
  voiceId: string;
  characterName: string;
  language?: string;
}): Promise<string> {
  const voiceId = params.voiceId.trim();
  if (!voiceId) throw new Error("Stimmen-ID fehlt.");

  const preset = parsePresetVoiceEntryId(voiceId);
  if (!preset) {
    return voiceId;
  }

  const created = await createVoiceboxPresetProfile({
    name: `${params.characterName.trim() || "Charakter"} — ${preset.voiceId}`,
    presetEngine: preset.engine,
    presetVoiceId: preset.voiceId,
    language: params.language ?? "de",
    description: `Scriptony — ${params.characterName.trim() || "Charakter"}`,
  });
  return created.id;
}

async function saveVoiceboxWavToProject(
  projectDir: string,
  wavBytes: ArrayBuffer,
): Promise<string> {
  if (import.meta.env.DEV && projectDir.includes("scriptony-preview")) {
    return `${projectDir}/.scriptony/voicebox-output/vb-qa-mock.wav`;
  }

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

async function pollVoiceboxGeneration(
  generationId: string,
  onProgress?: LoadingProgressReporter,
  options?: { modelLikelyCold?: boolean },
): Promise<VoiceboxGenerationRecord> {
  const modelLikelyCold = options?.modelLikelyCold ?? false;
  const started = Date.now();
  while (Date.now() - started < GENERATION_TIMEOUT_MS) {
    const resp = await fetch(
      `${baseUrl()}/history/${encodeURIComponent(generationId)}`,
    );
    if (resp.ok) {
      const record = (await resp.json()) as VoiceboxGenerationRecord;
      if (record.status === "completed" && record.audio_path) {
        return record;
      }
      if (record.status === "failed") {
        throw new Error(record.error?.trim() || "Voicebox TTS fehlgeschlagen.");
      }
      const elapsedMs = Date.now() - started;
      onProgress?.({
        percent: Math.min(92, 55 + Math.floor(elapsedMs / 10_000)),
        message: voiceboxGenerationProgressMessage(elapsedMs, modelLikelyCold),
        phase: "synthesis",
      });
    }
    await sleep(GENERATION_POLL_MS);
  }
  throw new VoiceboxGenerationTimeoutError(modelLikelyCold, false);
}

async function downloadVoiceboxGenerationAudio(
  generationId: string,
): Promise<ArrayBuffer> {
  const resp = await fetch(
    `${baseUrl()}/audio/${encodeURIComponent(generationId)}`,
    { method: "GET" },
  );
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(
      `Voicebox Audio-Download fehlgeschlagen (${resp.status})${detail ? `: ${detail}` : ""}`,
    );
  }
  const bytes = await resp.arrayBuffer();
  if (!bytes.byteLength) {
    throw new Error("Voicebox hat keine Audio-Daten zurückgegeben.");
  }
  return bytes;
}

async function startVoiceboxGeneration(params: {
  text: string;
  profileId: string;
  language?: string;
  engine?: string;
  seed?: number;
}): Promise<VoiceboxGenerationRecord> {
  const body: Record<string, unknown> = {
    text: params.text,
    profile_id: params.profileId,
    language: params.language ?? "de",
  };
  if (params.engine) {
    body.engine = params.engine;
  }
  if (params.seed != null && params.seed >= 0) {
    body.seed = params.seed;
  }

  const resp = await fetch(`${baseUrl()}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Voicebox-Client-Id": VOICEBOX_SCRIPTONY_CLIENT_ID,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(
      `Voicebox /generate fehlgeschlagen (${resp.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  const started = (await resp.json()) as VoiceboxGenerationRecord;
  if (!started.id?.trim()) {
    throw new Error("Voicebox hat keine Generierungs-ID zurückgegeben.");
  }
  return started;
}

async function resolveVoiceboxGenerationRecord(
  started: VoiceboxGenerationRecord,
  onProgress?: LoadingProgressReporter,
  options?: { modelLikelyCold?: boolean },
): Promise<VoiceboxGenerationRecord> {
  if (started.status === "completed" && started.audio_path) {
    return started;
  }
  return pollVoiceboxGeneration(started.id, onProgress, options);
}

export async function generateVoiceboxSpeech(params: {
  text: string;
  profileId: string;
  language?: string;
  projectDir?: string;
  engine?: string;
  seed?: number;
  onProgress?: LoadingProgressReporter;
}): Promise<VoiceboxGenerateResult> {
  if (!isDesktopShell()) {
    throw new Error("Voicebox TTS nur in der Desktop-App verfügbar.");
  }

  const profileId = params.profileId.trim();
  if (!profileId) {
    throw new Error("Voicebox profile_id fehlt.");
  }

  const profile = await getVoiceboxProfile(profileId);
  const engine = params.engine?.trim() || resolveEngineForProfile(profile);
  const language = params.language?.trim() || profile?.language?.trim() || "de";
  const health = await getVoiceboxHealth();
  const modelLikelyCold = !health?.model_loaded;

  let lastError: Error | undefined;

  for (
    let attempt = 0;
    attempt < VOICEBOX_GENERATION_MAX_ATTEMPTS;
    attempt += 1
  ) {
    const finalAttempt = attempt >= VOICEBOX_GENERATION_MAX_ATTEMPTS - 1;
    try {
      if (attempt > 0) {
        params.onProgress?.({
          percent: 52,
          message: "TTS-Zeitüberschreitung — erneuter Versuch…",
          phase: "synthesis",
        });
      }

      const started = await startVoiceboxGeneration({
        text: params.text,
        profileId,
        language,
        engine,
        seed: params.seed,
      });

      const record = await resolveVoiceboxGenerationRecord(
        started,
        params.onProgress,
        { modelLikelyCold },
      );

      const wavBytes = await downloadVoiceboxGenerationAudio(record.id);
      const durationMs =
        record.duration && record.duration > 0
          ? Math.round(record.duration * 1000)
          : estimateDurationMsFromWav(wavBytes);

      if (!params.projectDir?.trim()) {
        throw new Error(
          "Projektverzeichnis fehlt für Voicebox-Audio-Speicherung.",
        );
      }

      const audioPath = await saveVoiceboxWavToProject(
        params.projectDir.trim(),
        wavBytes,
      );

      markVoiceboxTtsSucceeded();

      return { audioPath, durationMs };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isTimeout = isVoiceboxGenerationTimeoutError(lastError);
      if (!isTimeout || finalAttempt) {
        if (isTimeout) {
          throw new VoiceboxGenerationTimeoutError(modelLikelyCold, true);
        }
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error("Voicebox TTS fehlgeschlagen.");
}

export async function uploadVoiceboxProfileSample(params: {
  profileId: string;
  file: Blob;
  fileName: string;
  referenceText: string;
}): Promise<{ sampleId: string }> {
  if (!isDesktopShell()) {
    throw new Error("Voicebox Clone nur in der Desktop-App verfügbar.");
  }

  const profileId = params.profileId.trim();
  const referenceText = params.referenceText.trim();
  if (!profileId) throw new Error("Voicebox profile_id fehlt.");
  if (!referenceText) throw new Error("Referenztext für Clone fehlt.");

  const form = new FormData();
  form.append("file", params.file, params.fileName);
  form.append("reference_text", referenceText);

  const resp = await fetch(
    `${baseUrl()}/profiles/${encodeURIComponent(profileId)}/samples`,
    { method: "POST", body: form },
  );

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(
      `Voicebox Sample-Upload fehlgeschlagen (${resp.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  const data = (await resp.json()) as { id?: string };
  if (!data.id?.trim()) {
    throw new Error("Voicebox Sample-Upload: ungültige Antwort.");
  }
  return { sampleId: data.id };
}

export async function ensureVoiceboxSidecar(
  onProgress?: LoadingProgressReporter,
): Promise<void> {
  if (!isDesktopShell()) return;
  await waitForVoiceboxReadyWithProgress(onProgress);
  await ensureVoiceboxScriptonyIntegration();
}

export async function ensureVoiceboxAvailable(
  onProgress?: LoadingProgressReporter,
): Promise<void> {
  await ensureVoiceboxSidecar(onProgress);
}
