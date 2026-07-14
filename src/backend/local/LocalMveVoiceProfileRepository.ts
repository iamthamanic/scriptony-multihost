/**
 * LocalMveVoiceProfileRepository — SQLite CRUD for MVE voice profiles.
 * Location: src/backend/local/LocalMveVoiceProfileRepository.ts
 */

import type {
  MveVoiceProfileCreatePayload,
  MveVoiceProfileUpdatePayload,
} from "../ScriptonyBackend";
import type { LocalDb } from "./LocalDb";
import type { BindParams } from "sql.js";
import { TABLE } from "@/local/project-schema";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import { mapMveVoiceProfileRow } from "./mve-mappers";
import { localId } from "./id";

export class LocalMveVoiceProfileRepository {
  constructor(private readonly db: LocalDb) {}

  async listByProject(projectId: string): Promise<MveVoiceProfile[]> {
    const rows = await this.db.all(
      `SELECT * FROM ${TABLE.MVE_VOICE_PROFILES} WHERE project_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
      [projectId],
    );
    return rows.map(mapMveVoiceProfileRow);
  }

  async get(id: string): Promise<MveVoiceProfile | null> {
    const row = await this.db.get(
      `SELECT * FROM ${TABLE.MVE_VOICE_PROFILES} WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    return row ? mapMveVoiceProfileRow(row) : null;
  }

  async getForCharacter(
    projectId: string,
    characterId: string,
  ): Promise<MveVoiceProfile | null> {
    const row = await this.db.get(
      `SELECT * FROM ${TABLE.MVE_VOICE_PROFILES}
       WHERE project_id = ? AND character_id = ? AND deleted_at IS NULL
       ORDER BY updated_at DESC LIMIT 1`,
      [projectId, characterId],
    );
    return row ? mapMveVoiceProfileRow(row) : null;
  }

  async create(
    projectId: string,
    payload: MveVoiceProfileCreatePayload,
  ): Promise<MveVoiceProfile> {
    const now = new Date().toISOString();
    const profile: MveVoiceProfile = {
      id: localId("mve_voice"),
      userId: payload.userId ?? "local-user",
      workspaceId: projectId,
      name: payload.name,
      language: payload.language ?? "de",
      engine: payload.engine ?? "elevenlabs",
      type: payload.type ?? "default",
      status: payload.status ?? "draft",
      characterId: payload.characterId,
      baseVoiceId: payload.baseVoiceId,
      referenceAudioUrl: payload.referenceAudioUrl,
      description: payload.description,
      designSpec: payload.designSpec ?? undefined,
      attributes: payload.attributes,
      defaultSettings: payload.defaultSettings,
      consentStatus: payload.consentStatus ?? "not_required",
      commercialUseAllowed: payload.commercialUseAllowed ?? false,
      previewText: payload.previewText,
      version: payload.version ?? 1,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.run(
      `INSERT INTO ${TABLE.MVE_VOICE_PROFILES} (
        id, project_id, user_id, character_id, name, language, engine, profile_type,
        status, base_voice_id, reference_audio_url, description, design_spec_json, attributes_json,
        default_settings_json, consent_status, commercial_use_allowed, preview_text,
        version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profile.id,
        projectId,
        profile.userId,
        payload.characterId ?? null,
        profile.name,
        profile.language,
        profile.engine,
        profile.type,
        profile.status,
        profile.baseVoiceId ?? null,
        profile.referenceAudioUrl ?? null,
        profile.description ?? null,
        profile.designSpec ? JSON.stringify(profile.designSpec) : null,
        profile.attributes ? JSON.stringify(profile.attributes) : null,
        profile.defaultSettings
          ? JSON.stringify(profile.defaultSettings)
          : null,
        profile.consentStatus,
        profile.commercialUseAllowed ? 1 : 0,
        profile.previewText ?? null,
        profile.version,
        profile.createdAt,
        profile.updatedAt,
      ],
    );

    await this.db.insertChange({
      projectId,
      entityType: TABLE.MVE_VOICE_PROFILES,
      entityId: profile.id,
      operation: "create",
      payload: profile,
    });

    return profile;
  }

  async update(
    id: string,
    patch: MveVoiceProfileUpdatePayload,
  ): Promise<MveVoiceProfile> {
    const existing = await this.get(id);
    if (!existing) throw new Error(`MVE voice profile ${id} not found`);

    const now = new Date().toISOString();
    const values: BindParams = [];
    const setParts: string[] = [];

    if (patch.name !== undefined) {
      setParts.push("name = ?");
      values.push(patch.name);
    }
    if (patch.characterId !== undefined) {
      setParts.push("character_id = ?");
      values.push(patch.characterId ?? null);
    }
    if (patch.language !== undefined) {
      setParts.push("language = ?");
      values.push(patch.language);
    }
    if (patch.engine !== undefined) {
      setParts.push("engine = ?");
      values.push(patch.engine);
    }
    if (patch.type !== undefined) {
      setParts.push("profile_type = ?");
      values.push(patch.type);
    }
    if (patch.status !== undefined) {
      setParts.push("status = ?");
      values.push(patch.status);
    }
    if (patch.baseVoiceId !== undefined) {
      setParts.push("base_voice_id = ?");
      values.push(patch.baseVoiceId ?? null);
    }
    if (patch.referenceAudioUrl !== undefined) {
      setParts.push("reference_audio_url = ?");
      values.push(patch.referenceAudioUrl ?? null);
    }
    if (patch.description !== undefined) {
      setParts.push("description = ?");
      values.push(patch.description ?? null);
    }
    if (patch.designSpec !== undefined) {
      setParts.push("design_spec_json = ?");
      values.push(patch.designSpec ? JSON.stringify(patch.designSpec) : null);
    }
    if (patch.attributes !== undefined) {
      setParts.push("attributes_json = ?");
      values.push(patch.attributes ? JSON.stringify(patch.attributes) : null);
    }
    if (patch.defaultSettings !== undefined) {
      setParts.push("default_settings_json = ?");
      values.push(
        patch.defaultSettings ? JSON.stringify(patch.defaultSettings) : null,
      );
    }
    if (patch.consentStatus !== undefined) {
      setParts.push("consent_status = ?");
      values.push(patch.consentStatus);
    }
    if (patch.commercialUseAllowed !== undefined) {
      setParts.push("commercial_use_allowed = ?");
      values.push(patch.commercialUseAllowed ? 1 : 0);
    }
    if (patch.previewText !== undefined) {
      setParts.push("preview_text = ?");
      values.push(patch.previewText ?? null);
    }
    if (patch.version !== undefined) {
      setParts.push("version = ?");
      values.push(patch.version);
    }

    setParts.push("updated_at = ?");
    values.push(now);
    values.push(id);

    await this.db.run(
      `UPDATE ${TABLE.MVE_VOICE_PROFILES} SET ${setParts.join(", ")} WHERE id = ?`,
      values,
    );

    const updated = await this.get(id);
    if (!updated) {
      throw new Error(`MVE voice profile ${id} not found after update`);
    }

    const projectRow = await this.db.get(
      `SELECT project_id FROM ${TABLE.MVE_VOICE_PROFILES} WHERE id = ?`,
      [id],
    );

    await this.db.insertChange({
      projectId: String(projectRow?.project_id ?? ""),
      entityType: TABLE.MVE_VOICE_PROFILES,
      entityId: id,
      operation: "update",
      payload: updated,
    });

    return updated;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.get(id);
    if (!existing) return;

    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE ${TABLE.MVE_VOICE_PROFILES} SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, id],
    );

    const projectRow = await this.db.get(
      `SELECT project_id FROM ${TABLE.MVE_VOICE_PROFILES} WHERE id = ?`,
      [id],
    );

    await this.db.insertChange({
      projectId: String(projectRow?.project_id ?? ""),
      entityType: TABLE.MVE_VOICE_PROFILES,
      entityId: id,
      operation: "delete",
      payload: { id },
    });
  }
}
