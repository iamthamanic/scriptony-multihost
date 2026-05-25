/**
 * LocalStructureRepository — project_nodes in SQLite (T38).
 */

import type { StructureNode, StructureRepository } from "../ScriptonyBackend";
import type { LocalDb } from "./LocalDb";
import { TABLE } from "@/local/project-schema";
import { mapNodeRow } from "./mappers";
import { localId } from "./id";

export class LocalStructureRepository implements StructureRepository {
	constructor(private readonly db: LocalDb) {}

	async getByProject(projectId: string): Promise<StructureNode[]> {
		const rows = await this.db.all(
			`SELECT * FROM ${TABLE.PROJECT_NODES} WHERE project_id = ? AND deleted_at IS NULL ORDER BY order_index ASC`,
			[projectId],
		);
		return rows.map(mapNodeRow);
	}

	async getNode(id: string): Promise<StructureNode | null> {
		const row = await this.db.get(
			`SELECT * FROM ${TABLE.PROJECT_NODES} WHERE id = ? AND deleted_at IS NULL`,
			[id],
		);
		return row ? mapNodeRow(row) : null;
	}

	async create(
		node: Omit<StructureNode, "id" | "createdAt" | "updatedAt">,
	): Promise<StructureNode> {
		const now = new Date().toISOString();
		const id = localId("node");
		const created: StructureNode = {
			id,
			projectId: node.projectId,
			parentId: node.parentId ?? null,
			type: node.type,
			label: node.label,
			orderIndex: node.orderIndex,
			createdAt: now,
			updatedAt: now,
		};

		await this.db.run(
			`INSERT INTO ${TABLE.PROJECT_NODES}
        (id, project_id, parent_id, node_type, label, order_index, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, '{}', ?, ?)`,
			[
				id,
				node.projectId,
				node.parentId ?? null,
				node.type,
				node.label,
				node.orderIndex,
				now,
				now,
			],
		);

		await this.db.insertChange({
			projectId: node.projectId,
			entityType: TABLE.PROJECT_NODES,
			entityId: id,
			operation: "create",
			payload: created,
		});

		return created;
	}

	async update(
		id: string,
		patch: Partial<StructureNode>,
	): Promise<StructureNode> {
		const existing = await this.getNode(id);
		if (!existing) throw new Error(`Structure node ${id} not found`);

		const now = new Date().toISOString();
		const values: (string | number | null)[] = [];
		const parts: string[] = [];

		if (patch.parentId !== undefined) {
			parts.push("parent_id = ?");
			values.push(patch.parentId);
		}
		if (patch.type !== undefined) {
			parts.push("node_type = ?");
			values.push(patch.type);
		}
		if (patch.label !== undefined) {
			parts.push("label = ?");
			values.push(patch.label);
		}
		if (patch.orderIndex !== undefined) {
			parts.push("order_index = ?");
			values.push(patch.orderIndex);
		}
		parts.push("updated_at = ?");
		values.push(now);
		values.push(id);

		await this.db.run(
			`UPDATE ${TABLE.PROJECT_NODES} SET ${parts.join(", ")} WHERE id = ?`,
			values,
		);

		await this.db.insertChange({
			projectId: existing.projectId,
			entityType: TABLE.PROJECT_NODES,
			entityId: id,
			operation: "update",
			payload: patch,
		});

		const updated = await this.getNode(id);
		if (!updated)
			throw new Error(`Structure node ${id} not found after update`);
		return updated;
	}

	async delete(id: string): Promise<void> {
		const existing = await this.getNode(id);
		if (!existing) return;

		const now = new Date().toISOString();
		await this.db.run(
			`UPDATE ${TABLE.PROJECT_NODES} SET deleted_at = ?, updated_at = ? WHERE id = ?`,
			[now, now, id],
		);

		await this.db.insertChange({
			projectId: existing.projectId,
			entityType: TABLE.PROJECT_NODES,
			entityId: id,
			operation: "delete",
			payload: { id },
		});
	}
}
