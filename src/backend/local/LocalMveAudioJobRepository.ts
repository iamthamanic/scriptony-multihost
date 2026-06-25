/**
 * LocalMveAudioJobRepository — SQLite CRUD for MVE render jobs.
 * Location: src/backend/local/LocalMveAudioJobRepository.ts
 */

import type { LocalDb } from "./LocalDb";
import { TABLE } from "@/local/project-schema";
import type { MveAudioJob } from "@/lib/multi-voice-engine/schema/audio-job";
import type {
  MveAudioJobCreatePayload,
  MveAudioJobUpdatePayload,
} from "../ScriptonyBackend";
import { mapMveAudioJobRow } from "./mve-mappers";
import { localId } from "./id";

export class LocalMveAudioJobRepository {
  constructor(private readonly db: LocalDb) {}

  async listByLine(lineId: string): Promise<MveAudioJob[]> {
    const rows = await this.db.all(
      `SELECT * FROM ${TABLE.MVE_AUDIO_JOBS} WHERE line_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
      [lineId],
    );
    return rows.map(mapMveAudioJobRow);
  }

  async get(id: string): Promise<MveAudioJob | null> {
    const row = await this.db.get(
      `SELECT * FROM ${TABLE.MVE_AUDIO_JOBS} WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    return row ? mapMveAudioJobRow(row) : null;
  }

  async create(
    projectId: string,
    payload: MveAudioJobCreatePayload,
  ): Promise<MveAudioJob> {
    const now = new Date().toISOString();
    const job: MveAudioJob = {
      id: localId("mve_job"),
      projectId,
      lineId: payload.lineId,
      status: payload.status ?? "pending",
      engine: payload.engine,
      takeCount: payload.takeCount ?? 1,
      scriptSnapshot: payload.scriptSnapshot,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.run(
      `INSERT INTO ${TABLE.MVE_AUDIO_JOBS} (
        id, project_id, line_id, status, engine, take_count,
        script_snapshot_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        job.id,
        job.projectId,
        job.lineId,
        job.status,
        job.engine,
        job.takeCount,
        JSON.stringify(job.scriptSnapshot),
        job.createdAt,
        job.updatedAt,
      ],
    );
    return job;
  }

  async update(
    id: string,
    patch: MveAudioJobUpdatePayload,
  ): Promise<MveAudioJob> {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`MVE audio job not found: ${id}`);
    }
    const updated: MveAudioJob = {
      ...existing,
      status: patch.status ?? existing.status,
      errorMessage:
        patch.errorMessage === null
          ? undefined
          : (patch.errorMessage ?? existing.errorMessage),
      updatedAt: new Date().toISOString(),
    };

    await this.db.run(
      `UPDATE ${TABLE.MVE_AUDIO_JOBS}
       SET status = ?, error_message = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [
        updated.status,
        updated.errorMessage ?? null,
        updated.updatedAt,
        id,
      ],
    );
    return updated;
  }
}
