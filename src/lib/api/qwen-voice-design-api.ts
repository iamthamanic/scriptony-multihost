/**
 * Qwen VoiceDesign REST client — localhost sidecar on port 3767.
 * Location: src/lib/api/qwen-voice-design-api.ts
 */

import { getQwenVoiceDesignSidecarBaseUrl } from "@/lib/env";
import { getVoiceDesignSidecarAuthToken } from "@/lib/local/voice-design-sidecar-lifecycle";
import { isDesktopShell } from "@/runtime/detect-runtime";

export const QWEN_VOICE_DESIGN_DEFAULT_CANDIDATE_COUNT = 3;
export const QWEN_VOICE_DESIGN_MAX_CANDIDATE_COUNT = 4;

export interface QwenVoiceDesignGenerateRequest {
  description: string;
  previewText: string;
  language: string;
  candidateCount?: number;
  temperatures?: number[];
}

export interface QwenVoiceDesignCandidate {
  id: string;
  label: string;
  audioUrl: string;
  description: string;
  durationMs: number;
  sampleRate: number;
}

export interface QwenVoiceDesignGenerateResponse {
  sessionId: string;
  candidates: QwenVoiceDesignCandidate[];
  warnings?: string[];
}

export interface QwenVoiceDesignMaterializeRequest {
  sessionId: string;
  candidateId: string;
  name: string;
  previewText: string;
  projectId: string;
  projectDir: string;
}

export interface QwenVoiceDesignVoiceProfileDraft {
  creationMode: "designed";
  provider: "qwen";
  model: string;
}

export interface QwenVoiceDesignMaterializeResponse {
  referenceAudioAssetId: string;
  referenceAudioUrl: string;
  referenceText: string;
  identityPrompt: string;
  voiceProfileDraft: QwenVoiceDesignVoiceProfileDraft;
}

export interface QwenVoiceDesignHealth {
  ok: boolean;
  model: string;
  ready: boolean;
  stub?: boolean;
}

export class QwenVoiceDesignValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QwenVoiceDesignValidationError";
  }
}

export class QwenVoiceDesignSidecarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QwenVoiceDesignSidecarError";
  }
}

function assertLocalhostSidecar(): void {
  if (!isDesktopShell()) {
    throw new QwenVoiceDesignSidecarError(
      "Qwen VoiceDesign ist nur in der Desktop-App verfügbar.",
    );
  }
  const base = getQwenVoiceDesignSidecarBaseUrl();
  if (!base.startsWith("http://127.0.0.1:")) {
    throw new QwenVoiceDesignSidecarError(
      "Qwen VoiceDesign Sidecar erlaubt nur localhost-Verbindungen.",
    );
  }
}

export function validateQwenVoiceDesignGenerateRequest(
  input: QwenVoiceDesignGenerateRequest,
): void {
  if (!input.description?.trim()) {
    throw new QwenVoiceDesignValidationError(
      "Beschreibung darf nicht leer sein.",
    );
  }
  if (!input.previewText?.trim()) {
    throw new QwenVoiceDesignValidationError(
      "Preview-Text darf nicht leer sein.",
    );
  }
  if (!input.language?.trim()) {
    throw new QwenVoiceDesignValidationError("Sprache ist erforderlich.");
  }
  const count =
    input.candidateCount ?? QWEN_VOICE_DESIGN_DEFAULT_CANDIDATE_COUNT;
  if (count < 1 || count > QWEN_VOICE_DESIGN_MAX_CANDIDATE_COUNT) {
    throw new QwenVoiceDesignValidationError(
      `Kandidatenanzahl muss zwischen 1 und ${QWEN_VOICE_DESIGN_MAX_CANDIDATE_COUNT} liegen.`,
    );
  }
  if (input.temperatures && input.temperatures.length !== count) {
    throw new QwenVoiceDesignValidationError(
      "temperatures muss dieselbe Länge wie candidateCount haben.",
    );
  }
}

export function validateQwenVoiceDesignMaterializeRequest(
  input: QwenVoiceDesignMaterializeRequest,
): void {
  if (!input.sessionId?.trim()) {
    throw new QwenVoiceDesignValidationError("sessionId ist erforderlich.");
  }
  if (!input.candidateId?.trim()) {
    throw new QwenVoiceDesignValidationError("candidateId ist erforderlich.");
  }
  if (!input.name?.trim()) {
    throw new QwenVoiceDesignValidationError(
      "Bitte einen Namen für die Stimme eingeben.",
    );
  }
  if (!input.previewText?.trim()) {
    throw new QwenVoiceDesignValidationError(
      "Preview-Text darf nicht leer sein.",
    );
  }
  if (!input.projectId?.trim()) {
    throw new QwenVoiceDesignValidationError("projectId ist erforderlich.");
  }
  if (!input.projectDir?.trim()) {
    throw new QwenVoiceDesignValidationError("projectDir ist erforderlich.");
  }
}

async function sidecarFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  assertLocalhostSidecar();
  const token = getVoiceDesignSidecarAuthToken();
  if (!token) {
    throw new QwenVoiceDesignSidecarError(
      "Qwen VoiceDesign Sidecar nicht authentifiziert — bitte Sidecar starten.",
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(init.headers as Record<string, string> | undefined),
  };

  let response: Response;
  try {
    response = await fetch(`${getQwenVoiceDesignSidecarBaseUrl()}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new QwenVoiceDesignSidecarError(
      "Qwen VoiceDesign Sidecar nicht erreichbar — bitte Sidecar starten oder die Desktop-App neu laden.",
    );
  }

  const raw = await response.text();
  let payload: unknown = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { detail: raw };
    }
  }

  if (!response.ok) {
    const detail =
      payload &&
      typeof payload === "object" &&
      "detail" in payload &&
      typeof (payload as { detail: unknown }).detail === "string"
        ? (payload as { detail: string }).detail
        : `Sidecar-Fehler (${response.status})`;
    if (response.status === 400) {
      throw new QwenVoiceDesignValidationError(detail);
    }
    throw new QwenVoiceDesignSidecarError(detail);
  }

  return payload as T;
}

export async function getQwenVoiceDesignHealth(): Promise<QwenVoiceDesignHealth | null> {
  if (!isDesktopShell()) return null;
  try {
    const response = await fetch(
      `${getQwenVoiceDesignSidecarBaseUrl()}/health`,
    );
    if (!response.ok) return null;
    return (await response.json()) as QwenVoiceDesignHealth;
  } catch {
    return null;
  }
}

export async function generateQwenVoiceDesignCandidates(
  input: QwenVoiceDesignGenerateRequest,
): Promise<QwenVoiceDesignGenerateResponse> {
  validateQwenVoiceDesignGenerateRequest(input);
  const candidateCount =
    input.candidateCount ?? QWEN_VOICE_DESIGN_DEFAULT_CANDIDATE_COUNT;
  return sidecarFetch<QwenVoiceDesignGenerateResponse>(
    "/voice-design/generate",
    {
      method: "POST",
      body: JSON.stringify({
        description: input.description.trim(),
        previewText: input.previewText.trim(),
        language: input.language.trim(),
        candidateCount,
        ...(input.temperatures ? { temperatures: input.temperatures } : {}),
      }),
    },
  );
}

export async function materializeQwenVoiceDesign(
  input: QwenVoiceDesignMaterializeRequest,
): Promise<QwenVoiceDesignMaterializeResponse> {
  validateQwenVoiceDesignMaterializeRequest(input);
  return sidecarFetch<QwenVoiceDesignMaterializeResponse>(
    "/voice-design/materialize",
    {
      method: "POST",
      body: JSON.stringify({
        sessionId: input.sessionId.trim(),
        candidateId: input.candidateId.trim(),
        name: input.name.trim(),
        previewText: input.previewText.trim(),
        projectId: input.projectId.trim(),
        projectDir: input.projectDir.trim(),
      }),
    },
  );
}
