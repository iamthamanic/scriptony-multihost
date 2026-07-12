/**
 * LocalMveLaneLinkRepository — SQLite CRUD for character-lane → scene/shot links.
 *
 * One active link per (project, character) pair. Replacing an existing link
 * soft-deletes it and creates a new row so the change_log stays meaningful.
 *
 * Location: src/backend/local/LocalMveLaneLinkRepository.ts
 */

import type { LocalDb } from "./LocalDb";
import type { BindParams } from "sql.js";
import { TABLE } from "@/local/project-schema";
import type {
  MveLaneLinkCreatePayload,
  MveLaneLinkUpdatePayload,
} from "../ScriptonyBackend";
import type { MveLaneLink } from "@/lib/multi-voice-engine/schema/lane-link";
import { localId } from "./id";

function mapRow(row: Record<string, unknown>): MveLaneLink {
  return {
    id: String(row.id ?? ""),
    projectId: String(row.project_id ?? ""),
    characterId: String(row.character_id ?? ""),
    targetContainerId: String(row.target_container_id ?? ""),
    targetContainerType: row.target_container_type === "shot" ? "shot" : "scene",
    enabled: Number(row.enabled ?? 1) === 1,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export class LocalMveLaneLinkRepository {
  constructor(private readonly db: LocalDb) {}

  async listByProject(projectId: string): Promise<MveLaneLink[]> {
    const rows = await this.db.all(
      `SELECT * FROM ${TABLE.MVE_LANE_LINKS}
       WHERE project_id = ? AND deleted_at IS NULL
       ORDER BY character_id ASC, created_at ASC`,
      [projectId],
    );
    return rows.map(mapRow);
  }

  async get(id: string): Promise<MveLaneLink | null> {
    const row = await this.db.get(
      `SELECT * FROM ${TABLE.MVE_LANE_LINKS} WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    return row ? mapRow(row) : null;
  }

  async getForCharacter(
    projectId: string,
    characterId: string,
  ): Promise<MveLaneLink | null> {
    const row = await this.db.get(
      `SELECT * FROM ${TABLE.MVE_LANE_LINKS}
       WHERE project_id = ? AND character_id = ? AND deleted_at IS NULL AND enabled = 1
       ORDER BY updated_at DESC LIMIT 1`,
      [projectId, characterId],
    );
    return row ? mapRow(row) : null;
  }

  async create(
    projectId: string,
    payload: MveLaneLinkCreatePayload,
  ): Promise<MveLaneLink> {
    const now = new Date().toISOString();

    await this.db.run(
      `UPDATE ${TABLE.MVE_LANE_LINKS}
       SET deleted_at = ?, updated_at = ?
       WHERE project_id = ? AND character_id = ? AND deleted_at IS NULL`,
      [now, now, projectId, payload.characterId],
    );

    const link: MveLaneLink = {
      id: localId("mve_lane_link"),
      projectId,
      characterId: payload.characterId,
      targetContainerId: payload.targetContainerId,
      targetContainerType: payload.targetContainerType ?? "scene",
      enabled: payload.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.run(
      `INSERT INTO ${TABLE.MVE_LANE_LINKS} (
        id, project_id, character_id, target_container_id, target_container_type,
        enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        link.id,
        link.projectId,
        link.characterId,
        link.targetContainerId,
        link.targetContainerType,
        link.enabled ? 1 : 0,
        link.createdAt,
        link.updatedAt,
      ],
    );

    await this.db.insertChange({
      projectId,
      entityType: TABLE.MVE_LANE_LINKS,
      entityId: link.id,
      operation: "create",
      payload: link,
    });

    return link;
  }

  async update(id: string, patch: MveLaneLinkUpdatePayload): Promise<MveLaneLink> {
    const existing = await this.get(id);
    if (!existing) throw new Error(`MVE lane link ${id} not found`);

    const now = new Date().toISOString();
    const values: BindParams = [];
    const setParts: string[] = [];

    if (patch.targetContainerId !== undefined) {
      setParts.push("target_container_id = ?");
      values.push(patch.targetContainerId);
    }
    if (patch.targetContainerType !== undefined) {
      setParts.push("target_container_type = ?");
      values.push(patch.targetContainerType);
    }
    if (patch.enabled !== undefined) {
      setParts.push("enabled = ?");
      values.push(patch.enabled ? 1 : 0);
    }

    setParts.push("updated_at = ?");
    values.push(now);
    values.push(id);

    await this.db.run(
      `UPDATE ${TABLE.MVE_LANE_LINKS} SET ${setParts.join(", ")} WHERE id = ?`,
      values,
    );

    const updated = await this.get(id);
    if (!updated) throw new Error(`MVE lane link ${id} not found after update`);

    await this.db.insertChange({
      projectId: updated.projectId,
      entityType: TABLE.MVE_LANE_LINKS,
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
      `UPDATE ${TABLE.MVE_LANE_LINKS} SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, id],
    );

    await this.db.insertChange({
      projectId: existing.projectId,
      entityType: TABLE.MVE_LANE_LINKS,
      entityId: id,
      operation: "delete",
      payload: { id },
    });
  }
}
