/**
 * LocalBeatsRepository — SQLite-backed story beat persistence (T62).
 *
 * Location: src/backend/local/LocalBeatsRepository.ts
 */

import type { BeatRepository } from "../ScriptonyBackend";
import type {
  CreateBeatPayload,
  StoryBeat,
  UpdateBeatPayload,
} from "@/lib/api/beats-api";
import type { LocalDb } from "./LocalDb";
import type { BindParams } from "sql.js";
import { TABLE } from "@/local/project-schema";
import { mapBeatRow } from "./mappers";
import { localId } from "./id";

export class LocalBeatsRepository implements BeatRepository {
  constructor(private readonly db: LocalDb) {}

  async list(projectId: string): Promise<StoryBeat[]> {
    const rows = await this.db.all(
      `SELECT * FROM ${TABLE.STORY_BEATS}
       WHERE project_id = ? AND deleted_at IS NULL
       ORDER BY order_index ASC, created_at ASC`,
      [projectId],
    );
    return rows.map(mapBeatRow);
  }

  async get(id: string): Promise<StoryBeat | null> {
    const row = await this.db.get(
      `SELECT * FROM ${TABLE.STORY_BEATS} WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    return row ? mapBeatRow(row) : null;
  }

  async create(
    projectId: string,
    payload: CreateBeatPayload,
  ): Promise<StoryBeat> {
    const now = new Date().toISOString();
    const id = localId("beat");
    const beat: StoryBeat = {
      id,
      project_id: projectId,
      user_id: "local-user",
      label: payload.label,
      template_abbr: payload.template_abbr,
      description: payload.description,
      from_container_id: payload.from_container_id,
      to_container_id: payload.to_container_id,
      pct_from: payload.pct_from ?? 0,
      pct_to: payload.pct_to ?? 0,
      color: payload.color,
      notes: payload.notes,
      order_index: payload.order_index ?? 0,
      created_at: now,
      updated_at: now,
    };

    await this.db.run(
      `INSERT INTO ${TABLE.STORY_BEATS} (
        id, project_id, user_id, label, template_abbr, description,
        from_container_id, to_container_id, pct_from, pct_to,
        color, notes, order_index, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        beat.id,
        beat.project_id,
        beat.user_id,
        beat.label,
        beat.template_abbr ?? null,
        beat.description ?? null,
        beat.from_container_id,
        beat.to_container_id,
        beat.pct_from,
        beat.pct_to,
        beat.color ?? null,
        beat.notes ?? null,
        beat.order_index,
        beat.created_at,
        beat.updated_at,
      ],
    );

    await this.db.insertChange({
      projectId,
      entityType: TABLE.STORY_BEATS,
      entityId: beat.id,
      operation: "create",
      payload: beat,
    });

    return beat;
  }

  async update(id: string, patch: UpdateBeatPayload): Promise<StoryBeat> {
    const existing = await this.get(id);
    if (!existing) throw new Error(`Beat ${id} not found`);

    const now = new Date().toISOString();
    const values: BindParams = [];
    const setParts: string[] = [];

    if (patch.label !== undefined) {
      setParts.push("label = ?");
      values.push(patch.label);
    }
    if (patch.template_abbr !== undefined) {
      setParts.push("template_abbr = ?");
      values.push(patch.template_abbr ?? null);
    }
    if (patch.description !== undefined) {
      setParts.push("description = ?");
      values.push(patch.description ?? null);
    }
    if (patch.from_container_id !== undefined) {
      setParts.push("from_container_id = ?");
      values.push(patch.from_container_id);
    }
    if (patch.to_container_id !== undefined) {
      setParts.push("to_container_id = ?");
      values.push(patch.to_container_id);
    }
    if (patch.pct_from !== undefined) {
      setParts.push("pct_from = ?");
      values.push(patch.pct_from);
    }
    if (patch.pct_to !== undefined) {
      setParts.push("pct_to = ?");
      values.push(patch.pct_to);
    }
    if (patch.color !== undefined) {
      setParts.push("color = ?");
      values.push(patch.color ?? null);
    }
    if (patch.notes !== undefined) {
      setParts.push("notes = ?");
      values.push(patch.notes ?? null);
    }
    if (patch.order_index !== undefined) {
      setParts.push("order_index = ?");
      values.push(patch.order_index);
    }

    setParts.push("updated_at = ?");
    values.push(now);
    values.push(id);

    await this.db.run(
      `UPDATE ${TABLE.STORY_BEATS} SET ${setParts.join(", ")} WHERE id = ?`,
      values,
    );

    await this.db.insertChange({
      projectId: existing.project_id,
      entityType: TABLE.STORY_BEATS,
      entityId: id,
      operation: "update",
      payload: patch,
    });

    const updated = await this.get(id);
    if (!updated) throw new Error(`Beat ${id} not found after update`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.get(id);
    if (!existing) return;

    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE ${TABLE.STORY_BEATS} SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, id],
    );

    await this.db.insertChange({
      projectId: existing.project_id,
      entityType: TABLE.STORY_BEATS,
      entityId: id,
      operation: "delete",
      payload: { id },
    });
  }
}
