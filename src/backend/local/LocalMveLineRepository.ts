/**
 * LocalMveLineRepository — SQLite CRUD for MVE dialog lines.
 * Location: src/backend/local/LocalMveLineRepository.ts
 */

import type {
  MveLineCreatePayload,
  MveLineUpdatePayload,
} from "../ScriptonyBackend";
import type { LocalDb } from "./LocalDb";
import type { BindParams } from "sql.js";
import { TABLE } from "@/local/project-schema";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import { mapMveLineRow } from "./mve-mappers";
import { localId } from "./id";

export class LocalMveLineRepository {
  constructor(private readonly db: LocalDb) {}

  async listByProject(projectId: string): Promise<MveLine[]> {
    const rows = await this.db.all(
      `SELECT * FROM ${TABLE.MVE_LINES} WHERE project_id = ? AND deleted_at IS NULL ORDER BY scene_id, order_index ASC`,
      [projectId],
    );
    return rows.map(mapMveLineRow);
  }

  async listByScene(sceneId: string): Promise<MveLine[]> {
    const rows = await this.db.all(
      `SELECT * FROM ${TABLE.MVE_LINES} WHERE scene_id = ? AND deleted_at IS NULL ORDER BY order_index ASC`,
      [sceneId],
    );
    return rows.map(mapMveLineRow);
  }

  async get(id: string): Promise<MveLine | null> {
    const row = await this.db.get(
      `SELECT * FROM ${TABLE.MVE_LINES} WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    return row ? mapMveLineRow(row) : null;
  }

  async getByAudioClipId(clipId: string): Promise<MveLine | null> {
    const row = await this.db.get(
      `SELECT * FROM ${TABLE.MVE_LINES} WHERE audio_clip_id = ? AND deleted_at IS NULL`,
      [clipId],
    );
    return row ? mapMveLineRow(row) : null;
  }

  async create(
    projectId: string,
    payload: MveLineCreatePayload,
  ): Promise<MveLine> {
    const now = new Date().toISOString();
    const line: MveLine = {
      id: localId("mve_line"),
      sceneId: payload.sceneId,
      orderIndex: payload.orderIndex ?? 0,
      type: payload.type ?? "dialogue",
      characterId: payload.characterId,
      text: payload.text,
      direction: payload.direction,
      selectedTakeId: payload.selectedTakeId,
      status: payload.status ?? "draft",
      audioClipId: payload.audioClipId,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.run(
      `INSERT INTO ${TABLE.MVE_LINES} (
        id, project_id, scene_id, order_index, line_type, character_id, text,
        direction_json, selected_take_id, status, audio_clip_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        line.id,
        projectId,
        line.sceneId,
        line.orderIndex,
        line.type,
        line.characterId ?? null,
        line.text ?? null,
        line.direction ? JSON.stringify(line.direction) : null,
        line.selectedTakeId ?? null,
        line.status,
        line.audioClipId ?? null,
        line.createdAt,
        line.updatedAt,
      ],
    );

    await this.db.insertChange({
      projectId,
      entityType: TABLE.MVE_LINES,
      entityId: line.id,
      operation: "create",
      payload: line,
    });

    return line;
  }

  async update(id: string, patch: MveLineUpdatePayload): Promise<MveLine> {
    const existing = await this.get(id);
    if (!existing) throw new Error(`MVE line ${id} not found`);

    const now = new Date().toISOString();
    const values: BindParams = [];
    const setParts: string[] = [];

    if (patch.orderIndex !== undefined) {
      setParts.push("order_index = ?");
      values.push(patch.orderIndex);
    }
    if (patch.type !== undefined) {
      setParts.push("line_type = ?");
      values.push(patch.type);
    }
    if (patch.characterId !== undefined) {
      setParts.push("character_id = ?");
      values.push(patch.characterId ?? null);
    }
    if (patch.text !== undefined) {
      setParts.push("text = ?");
      values.push(patch.text ?? null);
    }
    if (patch.direction !== undefined) {
      setParts.push("direction_json = ?");
      values.push(patch.direction ? JSON.stringify(patch.direction) : null);
    }
    if (patch.selectedTakeId !== undefined) {
      setParts.push("selected_take_id = ?");
      values.push(patch.selectedTakeId ?? null);
    }
    if (patch.status !== undefined) {
      setParts.push("status = ?");
      values.push(patch.status);
    }
    if (patch.audioClipId !== undefined) {
      setParts.push("audio_clip_id = ?");
      values.push(patch.audioClipId ?? null);
    }

    setParts.push("updated_at = ?");
    values.push(now);
    values.push(id);

    await this.db.run(
      `UPDATE ${TABLE.MVE_LINES} SET ${setParts.join(", ")} WHERE id = ?`,
      values,
    );

    const updated = await this.get(id);
    if (!updated) throw new Error(`MVE line ${id} not found after update`);

    const projectRow = await this.db.get(
      `SELECT project_id FROM ${TABLE.MVE_LINES} WHERE id = ?`,
      [id],
    );

    await this.db.insertChange({
      projectId: String(projectRow?.project_id ?? ""),
      entityType: TABLE.MVE_LINES,
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
      `UPDATE ${TABLE.MVE_LINES} SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, id],
    );

    const projectRow = await this.db.get(
      `SELECT project_id FROM ${TABLE.MVE_LINES} WHERE id = ?`,
      [id],
    );

    await this.db.insertChange({
      projectId: String(projectRow?.project_id ?? ""),
      entityType: TABLE.MVE_LINES,
      entityId: id,
      operation: "delete",
      payload: { id },
    });
  }
}
