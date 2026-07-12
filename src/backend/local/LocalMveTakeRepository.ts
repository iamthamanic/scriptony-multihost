/**
 * LocalMveTakeRepository — SQLite CRUD for MVE render takes.
 * Location: src/backend/local/LocalMveTakeRepository.ts
 */

import type { LocalDb } from "./LocalDb";
import { TABLE } from "@/local/project-schema";
import type { MveTake } from "@/lib/multi-voice-engine/schema/take";
import type {
  MveTakeCreatePayload,
  MveTakeUpdatePayload,
} from "../ScriptonyBackend";
import { mapMveTakeRow } from "./mve-mappers";
import { localId } from "./id";

export class LocalMveTakeRepository {
  constructor(private readonly db: LocalDb) {}

  async listByLine(lineId: string): Promise<MveTake[]> {
    const rows = await this.db.all(
      `SELECT * FROM ${TABLE.MVE_TAKES} WHERE line_id = ? AND deleted_at IS NULL ORDER BY take_index ASC`,
      [lineId],
    );
    return rows.map(mapMveTakeRow);
  }

  async listByJob(jobId: string): Promise<MveTake[]> {
    const rows = await this.db.all(
      `SELECT * FROM ${TABLE.MVE_TAKES} WHERE job_id = ? AND deleted_at IS NULL ORDER BY take_index ASC`,
      [jobId],
    );
    return rows.map(mapMveTakeRow);
  }

  async get(id: string): Promise<MveTake | null> {
    const row = await this.db.get(
      `SELECT * FROM ${TABLE.MVE_TAKES} WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    return row ? mapMveTakeRow(row) : null;
  }

  async create(
    projectId: string,
    payload: MveTakeCreatePayload,
  ): Promise<MveTake> {
    const now = new Date().toISOString();
    const take: MveTake = {
      id: localId("mve_take"),
      lineId: payload.lineId,
      jobId: payload.jobId,
      takeIndex: payload.takeIndex,
      audioUrl: payload.audioUrl,
      durationMs: payload.durationMs,
      renderSettings: payload.renderSettings,
      directionSnapshot: payload.directionSnapshot,
      isSelected: payload.isSelected ?? false,
      status: payload.status ?? "processing",
      createdAt: now,
      updatedAt: now,
    };

    await this.db.run(
      `INSERT INTO ${TABLE.MVE_TAKES} (
        id, project_id, line_id, job_id, take_index, audio_path, duration_ms,
        render_settings_json, direction_snapshot_json, is_selected, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        take.id,
        projectId,
        take.lineId,
        take.jobId,
        take.takeIndex,
        take.audioUrl ?? null,
        take.durationMs ?? null,
        take.renderSettings ? JSON.stringify(take.renderSettings) : null,
        take.directionSnapshot
          ? JSON.stringify(take.directionSnapshot)
          : null,
        take.isSelected ? 1 : 0,
        take.status,
        take.createdAt,
        take.updatedAt,
      ],
    );
    return take;
  }

  async update(id: string, patch: MveTakeUpdatePayload): Promise<MveTake> {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`MVE take not found: ${id}`);
    }
    const updated: MveTake = {
      ...existing,
      audioUrl:
        patch.audioUrl === null
          ? undefined
          : (patch.audioUrl ?? existing.audioUrl),
      durationMs:
        patch.durationMs === null
          ? undefined
          : (patch.durationMs ?? existing.durationMs),
      isSelected: patch.isSelected ?? existing.isSelected,
      status: patch.status ?? existing.status,
      updatedAt: new Date().toISOString(),
    };

    await this.db.run(
      `UPDATE ${TABLE.MVE_TAKES}
       SET audio_path = ?, duration_ms = ?, is_selected = ?, status = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [
        updated.audioUrl ?? null,
        updated.durationMs ?? null,
        updated.isSelected ? 1 : 0,
        updated.status,
        updated.updatedAt,
        id,
      ],
    );
    return updated;
  }

  async selectTake(lineId: string, takeId: string): Promise<MveTake> {
    await this.db.run(
      `UPDATE ${TABLE.MVE_TAKES} SET is_selected = 0, updated_at = ? WHERE line_id = ? AND deleted_at IS NULL`,
      [new Date().toISOString(), lineId],
    );
    const take = await this.update(takeId, { isSelected: true });
    await this.db.run(
      `UPDATE ${TABLE.MVE_LINES} SET selected_take_id = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
      [takeId, new Date().toISOString(), lineId],
    );
    return take;
  }
}
