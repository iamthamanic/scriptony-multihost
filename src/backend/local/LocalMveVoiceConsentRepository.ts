/**
 * LocalMveVoiceConsentRepository — SQLite CRUD for MVE voice consent records.
 * Location: src/backend/local/LocalMveVoiceConsentRepository.ts
 */

import type {
  MveVoiceConsentCreatePayload,
  MveVoiceConsentUpdatePayload,
} from "../ScriptonyBackend";
import type { LocalDb } from "./LocalDb";
import type { BindParams } from "sql.js";
import { TABLE } from "@/local/project-schema";
import type { MveVoiceConsent } from "@/lib/multi-voice-engine/schema/voice-consent";
import { localId } from "./id";

function mapRow(row: Record<string, unknown>): MveVoiceConsent {
  return {
    id: String(row.id ?? ""),
    projectId: String(row.project_id ?? ""),
    voiceId: String(row.voice_id ?? ""),
    userId: String(row.user_id ?? "local-user"),
    consentTextVersion: String(row.consent_text_version ?? ""),
    consentConfirmedAt: String(row.consent_confirmed_at ?? ""),
    sourceAudioHash: row.source_audio_hash
      ? String(row.source_audio_hash)
      : undefined,
    commercialUseAllowed: Number(row.commercial_use_allowed ?? 0) === 1,
    status:
      row.consent_status === "rejected" || row.consent_status === "blocked"
        ? row.consent_status
        : "verified",
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export class LocalMveVoiceConsentRepository {
  constructor(private readonly db: LocalDb) {}

  async listByProject(projectId: string): Promise<MveVoiceConsent[]> {
    const rows = await this.db.all(
      `SELECT * FROM ${TABLE.MVE_VOICE_CONSENTS}
       WHERE project_id = ? AND deleted_at IS NULL
       ORDER BY consent_confirmed_at DESC`,
      [projectId],
    );
    return rows.map(mapRow);
  }

  async listByVoice(voiceId: string): Promise<MveVoiceConsent[]> {
    const rows = await this.db.all(
      `SELECT * FROM ${TABLE.MVE_VOICE_CONSENTS}
       WHERE voice_id = ? AND deleted_at IS NULL
       ORDER BY consent_confirmed_at DESC`,
      [voiceId],
    );
    return rows.map(mapRow);
  }

  async get(id: string): Promise<MveVoiceConsent | null> {
    const row = await this.db.get(
      `SELECT * FROM ${TABLE.MVE_VOICE_CONSENTS} WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    return row ? mapRow(row) : null;
  }

  async getLatestVerifiedForVoice(
    voiceId: string,
  ): Promise<MveVoiceConsent | null> {
    const row = await this.db.get(
      `SELECT * FROM ${TABLE.MVE_VOICE_CONSENTS}
       WHERE voice_id = ? AND deleted_at IS NULL AND consent_status = 'verified'
       ORDER BY consent_confirmed_at DESC LIMIT 1`,
      [voiceId],
    );
    return row ? mapRow(row) : null;
  }

  async create(
    projectId: string,
    payload: MveVoiceConsentCreatePayload,
  ): Promise<MveVoiceConsent> {
    const now = new Date().toISOString();
    const consent: MveVoiceConsent = {
      id: localId("mve_consent"),
      projectId,
      voiceId: payload.voiceId,
      userId: payload.userId ?? "local-user",
      consentTextVersion: payload.consentTextVersion,
      consentConfirmedAt: payload.consentConfirmedAt ?? now,
      sourceAudioHash: payload.sourceAudioHash,
      commercialUseAllowed: payload.commercialUseAllowed ?? false,
      status: payload.status ?? "verified",
      createdAt: now,
      updatedAt: now,
    };

    await this.db.run(
      `INSERT INTO ${TABLE.MVE_VOICE_CONSENTS} (
        id, project_id, voice_id, user_id, consent_text_version,
        consent_confirmed_at, source_audio_hash, commercial_use_allowed,
        consent_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        consent.id,
        projectId,
        consent.voiceId,
        consent.userId,
        consent.consentTextVersion,
        consent.consentConfirmedAt,
        consent.sourceAudioHash ?? null,
        consent.commercialUseAllowed ? 1 : 0,
        consent.status,
        consent.createdAt,
        consent.updatedAt,
      ],
    );

    await this.db.insertChange({
      projectId,
      entityType: TABLE.MVE_VOICE_CONSENTS,
      entityId: consent.id,
      operation: "create",
      payload: consent,
    });

    return consent;
  }

  async update(
    id: string,
    patch: MveVoiceConsentUpdatePayload,
  ): Promise<MveVoiceConsent> {
    const existing = await this.get(id);
    if (!existing) throw new Error(`MVE voice consent ${id} not found`);

    const now = new Date().toISOString();
    const values: BindParams = [];
    const setParts: string[] = [];

    if (patch.sourceAudioHash !== undefined) {
      setParts.push("source_audio_hash = ?");
      values.push(patch.sourceAudioHash ?? null);
    }
    if (patch.commercialUseAllowed !== undefined) {
      setParts.push("commercial_use_allowed = ?");
      values.push(patch.commercialUseAllowed ? 1 : 0);
    }
    if (patch.status !== undefined) {
      setParts.push("consent_status = ?");
      values.push(patch.status);
    }

    setParts.push("updated_at = ?");
    values.push(now);
    values.push(id);

    await this.db.run(
      `UPDATE ${TABLE.MVE_VOICE_CONSENTS} SET ${setParts.join(", ")} WHERE id = ?`,
      values,
    );

    const updated = await this.get(id);
    if (!updated) {
      throw new Error(`MVE voice consent ${id} not found after update`);
    }

    await this.db.insertChange({
      projectId: existing.projectId,
      entityType: TABLE.MVE_VOICE_CONSENTS,
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
      `UPDATE ${TABLE.MVE_VOICE_CONSENTS} SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, id],
    );

    await this.db.insertChange({
      projectId: existing.projectId,
      entityType: TABLE.MVE_VOICE_CONSENTS,
      entityId: id,
      operation: "delete",
      payload: { id },
    });
  }
}
