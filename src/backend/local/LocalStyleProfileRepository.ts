/**
 * LocalStyleProfileRepository — SQLite-backed style profile persistence.
 * Location: src/backend/local/LocalStyleProfileRepository.ts
 */

import type {
  CreateStyleProfilePayload,
  StyleProfile,
  StyleProfileSyncMeta,
  UpdateStyleProfilePatch,
} from "@/lib/types/style-profile";
import type { LocalDb } from "./LocalDb";
import type { BindParams } from "sql.js";
import { TABLE } from "@/local/project-schema";
import { mapStyleProfileRow } from "./mappers";
import { localId } from "./id";
import { buildAndValidateSummary } from "@/lib/style-profile/summary";
import {
  buildSpecFromTemplate,
  templateIdToType,
} from "@/lib/style-profile/reference-presets";
import { createEmptyStyleProfileSpec } from "@/lib/style-profile/templates";
import { normalizeStyleProfileSpec } from "@/lib/style-profile/normalize";

export class LocalStyleProfileRepository {
  constructor(private readonly db: LocalDb) {}

  async list(
    projectId: string,
    options?: { activeStyleProfileId?: string | null },
  ): Promise<StyleProfile[]> {
    const rows = await this.db.all(
      `SELECT * FROM ${TABLE.STYLE_PROFILES} WHERE project_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC`,
      [projectId],
    );
    return rows.map((row) =>
      mapStyleProfileRow(row, {
        fullSpecEditing: true,
        isActiveForProject:
          options?.activeStyleProfileId != null &&
          String(row.id) === String(options.activeStyleProfileId),
      }),
    );
  }

  async get(id: string): Promise<StyleProfile | null> {
    const row = await this.db.get(
      `SELECT * FROM ${TABLE.STYLE_PROFILES} WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    return row ? mapStyleProfileRow(row, { fullSpecEditing: true }) : null;
  }

  async create(
    projectId: string,
    payload: CreateStyleProfilePayload,
  ): Promise<StyleProfile> {
    const now = new Date().toISOString();
    const id = localId("style");
    const templateId = payload.templateId;
    const type =
      payload.type ??
      (templateId ? templateIdToType(templateId) : "custom");
    const spec = templateId
      ? buildSpecFromTemplate(templateId)
      : normalizeStyleProfileSpec(payload.spec ?? createEmptyStyleProfileSpec());
    const configSummary = buildAndValidateSummary({
      spec,
      type,
      status: "draft",
      source: templateId
        ? { type: "template", templateId, importedAt: now }
        : { type: "manual" },
    });

    const profile = mapStyleProfileRow(
      {
        id,
        project_id: projectId,
        name: payload.name,
        description: payload.description ?? "",
        type,
        status: "draft",
        version: 1,
        preview_asset_id: null,
        config_summary_json: JSON.stringify(configSummary),
        spec_json: JSON.stringify(spec),
        source_json: JSON.stringify(
          templateId
            ? { type: "template", templateId }
            : { type: "manual" },
        ),
        sync_status: "local",
        cloud_id: null,
        last_synced_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      { fullSpecEditing: true },
    );

    await this.db.run(
      `INSERT INTO ${TABLE.STYLE_PROFILES} (
        id, project_id, name, description, type, status, version,
        preview_asset_id, config_summary_json, spec_json, source_json,
        sync_status, cloud_id, last_synced_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profile.id,
        projectId,
        profile.name,
        profile.description ?? "",
        profile.type,
        profile.status,
        profile.version,
        profile.previewImageId ?? null,
        JSON.stringify(configSummary),
        JSON.stringify(spec),
        JSON.stringify(profile.source ?? { type: "manual" }),
        "local",
        null,
        null,
        now,
        now,
      ],
    );

    await this.db.insertChange({
      projectId,
      entityType: TABLE.STYLE_PROFILES,
      entityId: profile.id,
      operation: "create",
      payload: profile,
    });

    return profile;
  }

  async update(id: string, patch: UpdateStyleProfilePatch): Promise<StyleProfile> {
    const existing = await this.get(id);
    if (!existing) throw new Error(`StyleProfile ${id} not found`);

    const now = new Date().toISOString();
    const nextSpec = patch.spec
      ? normalizeStyleProfileSpec(patch.spec)
      : existing.spec;
    const nextType = patch.type ?? existing.type;
    const nextStatus = patch.status ?? existing.status;
    const configSummary =
      patch.configSummary ??
      buildAndValidateSummary({
        spec: nextSpec,
        type: nextType,
        status: nextStatus,
        source: patch.source ?? existing.source,
      });

    const values: BindParams = [];
    const setParts: string[] = [];

    if (patch.name !== undefined) {
      setParts.push("name = ?");
      values.push(patch.name);
    }
    if (patch.description !== undefined) {
      setParts.push("description = ?");
      values.push(patch.description);
    }
    if (patch.type !== undefined) {
      setParts.push("type = ?");
      values.push(patch.type);
    }
    if (patch.status !== undefined) {
      setParts.push("status = ?");
      values.push(patch.status);
    }
    if (patch.previewImageId !== undefined) {
      setParts.push("preview_asset_id = ?");
      values.push(patch.previewImageId);
    }
    if (patch.version !== undefined) {
      setParts.push("version = ?");
      values.push(patch.version);
    }
    if (
      patch.spec !== undefined ||
      patch.configSummary !== undefined ||
      patch.type !== undefined ||
      patch.status !== undefined ||
      patch.source !== undefined
    ) {
      setParts.push("config_summary_json = ?");
      values.push(JSON.stringify(configSummary));
    }
    if (patch.spec !== undefined) {
      setParts.push("spec_json = ?");
      values.push(JSON.stringify(nextSpec));
    }
    if (patch.source !== undefined) {
      setParts.push("source_json = ?");
      values.push(JSON.stringify(patch.source));
    }

    setParts.push("updated_at = ?");
    values.push(now);
    values.push(id);

    await this.db.run(
      `UPDATE ${TABLE.STYLE_PROFILES} SET ${setParts.join(", ")} WHERE id = ?`,
      values,
    );

    await this.db.insertChange({
      projectId: existing.projectId,
      entityType: TABLE.STYLE_PROFILES,
      entityId: id,
      operation: "update",
      payload: patch,
    });

    const updated = await this.get(id);
    if (!updated) throw new Error(`StyleProfile ${id} not found after update`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.get(id);
    if (!existing) return;

    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE ${TABLE.STYLE_PROFILES} SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, id],
    );

    await this.db.insertChange({
      projectId: existing.projectId,
      entityType: TABLE.STYLE_PROFILES,
      entityId: id,
      operation: "delete",
      payload: { id },
    });
  }

  async patchSyncMeta(
    id: string,
    sync: Partial<StyleProfileSyncMeta>,
  ): Promise<void> {
    const setParts: string[] = [];
    const values: BindParams = [];

    if (sync.status !== undefined) {
      setParts.push("sync_status = ?");
      values.push(sync.status);
    }
    if (sync.cloudId !== undefined) {
      setParts.push("cloud_id = ?");
      values.push(sync.cloudId);
    }
    if (sync.lastSyncedAt !== undefined) {
      setParts.push("last_synced_at = ?");
      values.push(sync.lastSyncedAt);
    }
    if (setParts.length === 0) return;

    const now = new Date().toISOString();
    setParts.push("updated_at = ?");
    values.push(now);
    values.push(id);

    await this.db.run(
      `UPDATE ${TABLE.STYLE_PROFILES} SET ${setParts.join(", ")} WHERE id = ?`,
      values,
    );
  }
}
