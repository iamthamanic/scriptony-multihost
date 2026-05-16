/**
 * AudioClip API Client — CRUD fuer AudioClip (Ist-Ebene).
 *
 * T28: Implementierung mit API Gateway.
 * SRP: Nur Clip-CRUD. Kein Track-Logik, kein TTS.
 *
 * Security (OWASP ASVS):
 * - Alle Calls erfordern Access Token (Auth Header).
 * - Keine Secrets im Client-Code (nur Routen, keine API Keys).
 * - camelCase → snake_case Mapping vor dem Senden (Backend-Konvention).
 */

import { apiRequest, unwrapApiResult } from "../api-client";
import type { RippleAct, RippleScene, RippleSequence } from "../ripple-engine";
import type { AudioClip } from "../types";

// ── camelCase → snake_case Mapper ─────────────────────────────────

const CAMEL_TO_SNAKE: Record<string, string> = {
  trackId: "track_id",
  sceneId: "scene_id",
  projectId: "project_id",
  startSec: "start_sec",
  endSec: "end_sec",
  laneIndex: "lane_index",
  orderIndex: "order_index",
  audioFileId: "audio_file_id",
  waveformData: "waveform_data",
  crossScene: "cross_scene",
  fxPresetId: "fx_preset_id",
  trackType: "track_type",
  content: "content",
  characterId: "character_id",
};

function mapKeysToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const mapped = CAMEL_TO_SNAKE[key] ?? key;
    out[mapped] = value;
  }
  return out;
}

// ── List ──────────────────────────────────────────────────────────

export async function getClipsByScene(
  sceneId: string,
  _accessToken: string,
): Promise<AudioClip[]> {
  const result = await apiRequest<{ clips: AudioClip[] }>(
    `/clips?sceneId=${encodeURIComponent(sceneId)}`,
    { method: "GET", requireAuth: true },
  );
  const data = unwrapApiResult(result);
  return data?.clips || [];
}

// ── Create ────────────────────────────────────────────────────────

export async function createClip(
  sceneId: string,
  projectId: string,
  clipData: Partial<AudioClip>,
  _accessToken: string,
): Promise<AudioClip> {
  const payload = mapKeysToSnake({
    sceneId,
    projectId,
    ...clipData,
  });

  const result = await apiRequest<{ clip: AudioClip }>("/clips", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    requireAuth: true,
  });
  const data = unwrapApiResult(result);
  if (!data?.clip) throw new Error("Failed to create audio clip");
  return data.clip;
}

// ── Update ───────────────────────────────────────────────────────

export async function updateClip(
  clipId: string,
  updates: Partial<AudioClip>,
  _accessToken: string,
): Promise<AudioClip> {
  const result = await apiRequest<{ clip: AudioClip }>(`/clips/${clipId}`, {
    method: "PUT",
    body: JSON.stringify(mapKeysToSnake(updates)),
    headers: { "Content-Type": "application/json" },
    requireAuth: true,
  });
  const data = unwrapApiResult(result);
  if (!data?.clip) throw new Error("Failed to update audio clip");
  return data.clip;
}

// ── Ripple ──────────────────────────────────────────────────────

export interface RipplePayload {
  changedClipId: string;
  newEndSec: number;
  allClips: AudioClip[];
  allScenes: RippleScene[];
  allSequences: RippleSequence[];
  allActs: RippleAct[];
}

export interface RippleResult {
  stats: {
    affectedClips: number;
    affectedScenes: number;
    affectedSequences: number;
    affectedActs: number;
    deltaSec: number;
  };
  updatedClips: number;
  scenes?: Array<Record<string, unknown>>;
  sequences?: Array<Record<string, unknown>>;
  acts?: Array<Record<string, unknown>>;
  errors?: string[];
  warning?: string;
}

export async function rippleClips(
  payload: RipplePayload,
  _accessToken: string,
): Promise<RippleResult> {
  const snakePayload = {
    changedClipId: payload.changedClipId,
    newEndSec: payload.newEndSec,
    allClips: payload.allClips.map((c) =>
      mapKeysToSnake(c as unknown as Record<string, unknown>),
    ),
    allScenes: payload.allScenes,
    allSequences: payload.allSequences,
    allActs: payload.allActs,
  };

  const result = await apiRequest<RippleResult>("/clips/ripple", {
    method: "POST",
    body: JSON.stringify(snakePayload),
    headers: { "Content-Type": "application/json" },
    requireAuth: true,
  });
  const data = unwrapApiResult(result);
  if (!data) throw new Error("Failed to ripple clips");
  return data;
}

// ── Delete ───────────────────────────────────────────────────────

export async function deleteClip(
  clipId: string,
  _accessToken: string,
): Promise<void> {
  const result = await apiRequest<{ deleted: boolean }>(`/clips/${clipId}`, {
    method: "DELETE",
    requireAuth: true,
  });
  unwrapApiResult(result);
}
