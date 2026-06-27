/**
 * LocalMveVoiceRequestRepository — SQLite CRUD for MVE voice operation requests.
 * Location: src/backend/local/LocalMveVoiceRequestRepository.ts
 */

import type {
  MveVoiceRequestCreatePayload,
  MveVoiceRequestUpdatePayload,
} from "../ScriptonyBackend";
import type { LocalDb } from "./LocalDb";
import type { BindParams } from "sql.js";
import { TABLE } from "@/local/project-schema";
import type { MveVoiceRequest } from "@/lib/multi-voice-engine/schema/voice-operations";
import { localId } from "./id";

function mapRow(row: Record<string, unknown>): MveVoiceRequest {
  return {
    id: String(row.id ?? ""),
    projectId: String(row.project_id ?? ""),
    voiceProfileId: row.voice_profile_id
      ? String(row.voice_profile_id)
      : undefined,
    operationType:
      row.operation_type === "generate" ||
      row.operation_type === "clone" ||
      row.operation_type === "tune"
        ? row.operation_type
        : "generate",
    status:
      row.status === "processing" ||
      row.status === "completed" ||
      row.status === "failed"
        ? row.status
        : "pending",
    inputJson: String(row.input_json ?? "{}"),
    errorMessage: row.error_message ? String(row.error_message) : undefined,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export class LocalMveVoiceRequestRepository {
  constructor(private readonly db: LocalDb) {}

  async listByProject(projectId: string): Promise<MveVoiceRequest[]> {
    const rows = await this.db.all(
      `SELECT * FROM ${TABLE.MVE_VOICE_REQUESTS}
       WHERE project_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [projectId],
    );
    return rows.map(mapRow);
  }

  async get(id: string): Promise<MveVoiceRequest | null> {
    const row = await this.db.get(
      `SELECT * FROM ${TABLE.MVE_VOICE_REQUESTS} WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    return row ? mapRow(row) : null;
  }

  async create(
    projectId: string,
    payload: MveVoiceRequestCreatePayload,
  ): Promise<MveVoiceRequest> {
    const now = new Date().toISOString();
    const request: MveVoiceRequest = {
      id: localId("mve_voice_req"),
      projectId,
      voiceProfileId: payload.voiceProfileId,
      operationType: payload.operationType,
      status: payload.status ?? "pending",
      inputJson: payload.inputJson,
      errorMessage: payload.errorMessage,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.run(
      `INSERT INTO ${TABLE.MVE_VOICE_REQUESTS} (
        id, project_id, voice_profile_id, operation_type, status,
        input_json, error_message, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        request.id,
        projectId,
        request.voiceProfileId ?? null,
        request.operationType,
        request.status,
        request.inputJson,
        request.errorMessage ?? null,
        request.createdAt,
        request.updatedAt,
      ],
    );

    await this.db.insertChange({
      projectId,
      entityType: TABLE.MVE_VOICE_REQUESTS,
      entityId: request.id,
      operation: "create",
      payload: request,
    });

    return request;
  }

  async update(
    id: string,
    patch: MveVoiceRequestUpdatePayload,
  ): Promise<MveVoiceRequest> {
    const existing = await this.get(id);
    if (!existing) throw new Error(`MVE voice request ${id} not found`);

    const now = new Date().toISOString();
    const values: BindParams = [];
    const setParts: string[] = [];

    if (patch.voiceProfileId !== undefined) {
      setParts.push("voice_profile_id = ?");
      values.push(patch.voiceProfileId ?? null);
    }
    if (patch.status !== undefined) {
      setParts.push("status = ?");
      values.push(patch.status);
    }
    if (patch.errorMessage !== undefined) {
      setParts.push("error_message = ?");
      values.push(patch.errorMessage ?? null);
    }

    setParts.push("updated_at = ?");
    values.push(now);
    values.push(id);

    await this.db.run(
      `UPDATE ${TABLE.MVE_VOICE_REQUESTS} SET ${setParts.join(", ")} WHERE id = ?`,
      values,
    );

    const updated = await this.get(id);
    if (!updated) {
      throw new Error(`MVE voice request ${id} not found after update`);
    }

    await this.db.insertChange({
      projectId: existing.projectId,
      entityType: TABLE.MVE_VOICE_REQUESTS,
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
      `UPDATE ${TABLE.MVE_VOICE_REQUESTS} SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, id],
    );

    await this.db.insertChange({
      projectId: existing.projectId,
      entityType: TABLE.MVE_VOICE_REQUESTS,
      entityId: id,
      operation: "delete",
      payload: { id },
    });
  }
}
