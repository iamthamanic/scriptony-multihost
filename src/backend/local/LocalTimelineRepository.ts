/**
 * LocalTimelineRepository — SQLite-backed timeline persistence.
 *
 * T38: Timeline data is derived from project_nodes (acts/scenes/sequences).
 * MVP: reads/writes project_nodes with timeline-relevant types.
 * All queries use parameterised statements (OWASP ASVS 5.x).
 */

import type { TimelineRepository } from "../ScriptonyBackend";
import type { LocalDb } from "./LocalDb";
import { TABLE } from "@/local/project-schema";
import { mapNodeRow } from "./mappers";
import { localId } from "./id";

/**
 * MVP: Timeline entries are project_nodes with specific types (act, sequence, scene).
 * The TimelineRepository interface uses `unknown` for the entity type,
 * so we return the raw StructureNode-like objects.
 */
export class LocalTimelineRepository implements TimelineRepository {
	constructor(private readonly db: LocalDb) {}

	async getByProject(projectId: string): Promise<unknown[]> {
		const rows = await this.db.all(
			"SELECT * FROM project_nodes WHERE project_id = ? AND deleted_at IS NULL AND node_type IN ('act', 'sequence', 'scene') ORDER BY order_index ASC",
			[projectId],
		);
		return rows.map(mapNodeRow);
	}

	async getByScene(sceneId: string): Promise<unknown[]> {
		// Get the node itself + its direct children (shots/beats)
		const rows = await this.db.all(
			"SELECT * FROM project_nodes WHERE (id = ? OR parent_id = ?) AND deleted_at IS NULL ORDER BY order_index ASC",
			[sceneId, sceneId],
		);
		return rows.map(mapNodeRow);
	}

	async create(projectId: string, payload: unknown): Promise<unknown> {
		const node = payload as Record<string, unknown>;
		const now = new Date().toISOString();
		const id = localId("node");

		await this.db.run(
			"INSERT INTO project_nodes (id, project_id, parent_id, node_type, label, order_index, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
			[
				id,
				projectId,
				(node.parentId as string) ?? null,
				(node.type as string) ?? "scene",
				(node.label as string) ?? "",
				(node.orderIndex as number) ?? 0,
				JSON.stringify(node.metadata ?? {}),
				now,
				now,
			],
		);

		await this.db.insertChange({
			projectId,
			entityType: TABLE.PROJECT_NODES,
			entityId: id,
			operation: "create",
			payload,
		});

		return { id, projectId, ...node, createdAt: now, updatedAt: now };
	}

	async update(id: string, patch: unknown): Promise<unknown> {
		const existing = await this.db.get(
			"SELECT * FROM project_nodes WHERE id = ? AND deleted_at IS NULL",
			[id],
		);
		if (!existing) throw new Error(`Timeline node ${id} not found`);

		const nodePatch = patch as Record<string, unknown>;
		const now = new Date().toISOString();
		// Column names are all hardcoded — not derived from user input (OWASP ASVS 5.x)
		const values: (string | number | null)[] = [];
		const setParts: string[] = [];

		if (nodePatch.parentId !== undefined) {
			setParts.push("parent_id = ?");
			values.push((nodePatch.parentId as string) ?? null);
		}
		if (nodePatch.type !== undefined) {
			setParts.push("node_type = ?");
			values.push(nodePatch.type as string);
		}
		if (nodePatch.label !== undefined) {
			setParts.push("label = ?");
			values.push(nodePatch.label as string);
		}
		if (nodePatch.orderIndex !== undefined) {
			setParts.push("order_index = ?");
			values.push(nodePatch.orderIndex as number);
		}

		setParts.push("updated_at = ?");
		values.push(now);
		values.push(id);

		await this.db.run(
			"UPDATE project_nodes SET " + setParts.join(", ") + " WHERE id = ?",
			values,
		);

		await this.db.insertChange({
			projectId: existing.project_id as string,
			entityType: TABLE.PROJECT_NODES,
			entityId: id,
			operation: "update",
			payload: patch,
		});

		const updated = await this.db.get(
			"SELECT * FROM project_nodes WHERE id = ? AND deleted_at IS NULL",
			[id],
		);
		return updated ? mapNodeRow(updated) : null;
	}

	async delete(id: string): Promise<void> {
		const existing = await this.db.get(
			"SELECT * FROM project_nodes WHERE id = ? AND deleted_at IS NULL",
			[id],
		);
		if (!existing) return; // idempotent

		const now = new Date().toISOString();
		await this.db.run(
			"UPDATE project_nodes SET deleted_at = ?, updated_at = ? WHERE id = ?",
			[now, now, id],
		);

		await this.db.insertChange({
			projectId: existing.project_id as string,
			entityType: TABLE.PROJECT_NODES,
			entityId: id,
			operation: "delete",
			payload: { id },
		});
	}
}
