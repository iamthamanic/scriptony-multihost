/**
 * MVE SQLite row mappers — Line and VoiceProfile domain ↔ DB.
 * Location: src/backend/local/mve-mappers.ts
 */

import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { MveLineDirection } from "@/lib/multi-voice-engine/schema/line-direction";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import type { MveAudioJob } from "@/lib/multi-voice-engine/schema/audio-job";
import type { MveTake } from "@/lib/multi-voice-engine/schema/take";
import type { VoiceRenderSettings } from "@/lib/multi-voice-engine/schema/render-line";
import {
  parseMveAudioJob,
  parseMveLine,
  parseMveTake,
  parseMveVoiceProfile,
} from "@/lib/multi-voice-engine/schema/parse";
import { DEFAULT_VOICE_ENGINE } from "@/lib/config/voice-engine";

function parseJson<T>(value: unknown, field: string): T | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "object") return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch (error) {
    console.warn(`[mve-mappers] Failed to parse ${field}:`, error);
    return undefined;
  }
}

export function mapMveLineRow(row: Record<string, unknown>): MveLine {
  const direction = parseJson<MveLineDirection>(row.direction_json, "direction_json");
  const candidate = {
    id: String(row.id ?? ""),
    sceneId: String(row.scene_id ?? ""),
    orderIndex: Number(row.order_index ?? 0),
    type: row.line_type ?? "dialogue",
    characterId: row.character_id ? String(row.character_id) : undefined,
    text: row.text != null ? String(row.text) : undefined,
    direction,
    selectedTakeId: row.selected_take_id
      ? String(row.selected_take_id)
      : undefined,
    status: row.status ?? "draft",
    audioClipId: row.audio_clip_id ? String(row.audio_clip_id) : undefined,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
  const parsed = parseMveLine(candidate);
  if (!parsed.success) {
    throw new Error(
      `Invalid MVE line row ${candidate.id}: ${parsed.messages.join("; ")}`,
    );
  }
  return parsed.data;
}

export function mapMveVoiceProfileRow(
  row: Record<string, unknown>,
): MveVoiceProfile {
  const projectId = String(row.project_id ?? "");
  const candidate = {
    id: String(row.id ?? ""),
    userId: String(row.user_id ?? "local-user"),
    workspaceId: projectId,
    name: String(row.name ?? ""),
    language: row.language ?? "de",
    engine: row.engine ?? DEFAULT_VOICE_ENGINE,
    type: row.profile_type ?? "default",
    status: row.status ?? "draft",
    characterId: row.character_id ? String(row.character_id) : undefined,
    baseVoiceId: row.base_voice_id ? String(row.base_voice_id) : undefined,
    referenceAudioUrl: row.reference_audio_url
      ? String(row.reference_audio_url)
      : undefined,
    description: row.description != null ? String(row.description) : undefined,
    attributes: parseJson(row.attributes_json, "attributes_json"),
    defaultSettings: parseJson(row.default_settings_json, "default_settings_json"),
    consentStatus: row.consent_status ?? "not_required",
    commercialUseAllowed: Number(row.commercial_use_allowed ?? 0) === 1,
    previewText: row.preview_text != null ? String(row.preview_text) : undefined,
    version: Number(row.version ?? 1),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
  const parsed = parseMveVoiceProfile(candidate);
  if (!parsed.success) {
    throw new Error(
      `Invalid MVE voice profile row ${candidate.id}: ${parsed.messages.join("; ")}`,
    );
  }
  return parsed.data;
}

export function mapMveAudioJobRow(row: Record<string, unknown>): MveAudioJob {
  const candidate = {
    id: String(row.id ?? ""),
    projectId: String(row.project_id ?? ""),
    lineId: String(row.line_id ?? ""),
    status: row.status ?? "pending",
    engine: String(row.engine ?? DEFAULT_VOICE_ENGINE),
    takeCount: Number(row.take_count ?? 1),
    scriptSnapshot: parseJson(row.script_snapshot_json, "script_snapshot_json"),
    errorMessage:
      row.error_message != null ? String(row.error_message) : undefined,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
  const parsed = parseMveAudioJob(candidate);
  if (!parsed.success) {
    throw new Error(
      `Invalid MVE audio job row ${candidate.id}: ${parsed.messages.join("; ")}`,
    );
  }
  return parsed.data;
}

export function mapMveTakeRow(row: Record<string, unknown>): MveTake {
  const direction = parseJson<MveLineDirection>(
    row.direction_snapshot_json,
    "direction_snapshot_json",
  );
  const candidate = {
    id: String(row.id ?? ""),
    lineId: String(row.line_id ?? ""),
    jobId: String(row.job_id ?? ""),
    takeIndex: Number(row.take_index ?? 0),
    audioUrl: row.audio_path ? String(row.audio_path) : undefined,
    durationMs: row.duration_ms != null ? Number(row.duration_ms) : undefined,
    renderSettings: parseJson<VoiceRenderSettings>(
      row.render_settings_json,
      "render_settings_json",
    ),
    directionSnapshot: direction,
    isSelected: Number(row.is_selected ?? 0) === 1,
    status: row.status ?? "processing",
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
  const parsed = parseMveTake(candidate);
  if (!parsed.success) {
    throw new Error(
      `Invalid MVE take row ${candidate.id}: ${parsed.messages.join("; ")}`,
    );
  }
  return parsed.data;
}
