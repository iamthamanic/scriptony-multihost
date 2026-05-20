/**
 * Audio TTS API Client — SRP: Nur TTS-Job-Management.
 *
 * T31: TTS-Pipeline und Audio-Generierung.
 * - createTtsJob: Erstellt TTS-Job über scriptony-audio-story
 * - getTtsStatus: Fragt Job-Status ab
 * - Keine TTS-Engine-Logik hier.
 */

import { apiPost, apiGet, unwrapApiResult } from "../api-client";

export interface TtsJobPayload {
  trackId: string;
  clipId: string;
  text: string;
  voiceId: string;
  emotion?: string;
  speed?: number;
  stability?: number;
  style?: number;
}

export type TtsJobStatus =
  | "idle"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface TtsJobResponse {
  success: boolean;
  jobId: string;
  status: TtsJobStatus;
  message: string;
}

export interface TtsStatusResponse {
  jobId: string;
  status: TtsJobStatus;
  progress?: number;
  error?: string;
  result?: Record<string, unknown>;
}

/**
 * Erstellt einen TTS-Generierungs-Job.
 * Der Backend erstellt einen Job in scriptony-jobs und
 * trigger die scriptony-audio Function.
 */
export async function createTtsJob(
  payload: TtsJobPayload,
): Promise<TtsJobResponse> {
  const result = await apiPost<TtsJobResponse>("/tts", payload);
  const data = unwrapApiResult(result);
  if (!data?.jobId) throw new Error("Failed to create TTS job");
  return data;
}

/**
 * Fragt den Status eines TTS-Jobs ab.
 */
export async function getTtsStatus(jobId: string): Promise<TtsStatusResponse> {
  const result = await apiGet<TtsStatusResponse>(
    `/tts/status/${encodeURIComponent(jobId)}`,
  );
  return unwrapApiResult(result);
}
