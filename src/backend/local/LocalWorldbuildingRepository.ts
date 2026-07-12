/**
 * LocalWorldbuildingRepository — SQLite-backed worldbuilding item persistence.
 *
 * T38: CRUD for world_items table with soft delete and change_log.
 * All queries use parameterised statements (OWASP ASVS 5.x).
 */

import type {
	WorldbuildingEntry,
	WorldbuildingRepository,
} from "../ScriptonyBackend";
import type { LocalDb } from "./LocalDb";
import type { BindParams } from "sql.js";
import { TABLE } from "@/local/project-schema";
import { mapWorldItemRow } from "./mappers";
import { localId } from "./id";

export class LocalWorldbuildingRepository implements WorldbuildingRepository {
	constructor(private readonly db: LocalDb) {}

	async list(projectId: string): Promise<WorldbuildingEntry[]> {
		const rows = await this.db.all(
			"SELECT * FROM world_items WHERE project_id = ? AND deleted_at IS NULL ORDER BY created_at ASC",
			[projectId],
		);
		return rows.map(mapWorldItemRow);
	}

	async get(id: string): Promise<WorldbuildingEntry | null> {
		const row = await this.db.get(
			"SELECT * FROM world_items WHERE id = ? AND deleted_at IS NULL",
			[id],
		);
		return row ? mapWorldItemRow(row) : null;
	}

	async create(
		projectId: string,
		payload: Partial<WorldbuildingEntry>,
	): Promise<WorldbuildingEntry> {
		const now = new Date().toISOString();
		const id = localId("local");
		const entry: WorldbuildingEntry = {
			id,
			projectId,
			category: payload.category ?? "custom",
			label: payload.label ?? "Untitled",
			content: payload.content ?? "",
			createdAt: now,
			updatedAt: now,
		};

		await this.db.run(
			"INSERT INTO world_items (id, project_id, category, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
			[
				entry.id,
				entry.projectId,
				entry.category,
				entry.label,
				entry.content,
				entry.createdAt,
				entry.updatedAt,
			],
		);

		await this.db.insertChange({
			projectId,
			entityType: TABLE.WORLD_ITEMS,
			entityId: entry.id,
			operation: "create",
			payload: entry,
		});

		return entry;
	}

	async update(
		id: string,
		patch: Partial<WorldbuildingEntry>,
	): Promise<WorldbuildingEntry> {
		const existing = await this.get(id);
		if (!existing) throw new Error(`WorldbuildingEntry ${id} not found`);

		const now = new Date().toISOString();
		// Column names are all hardcoded — not derived from user input (OWASP ASVS 5.x)
		const values: BindParams = [];
		const setParts: string[] = [];

		if (patch.category !== undefined) {
			setParts.push("category = ?");
			values.push(patch.category);
		}
		if (patch.label !== undefined) {
			setParts.push("title = ?");
			values.push(patch.label);
		}
		if (patch.content !== undefined) {
			setParts.push("content = ?");
			values.push(patch.content);
		}

		setParts.push("updated_at = ?");
		values.push(now);
		values.push(id);

		await this.db.run(
			"UPDATE world_items SET " + setParts.join(", ") + " WHERE id = ?",
			values,
		);

		await this.db.insertChange({
			projectId: existing.projectId,
			entityType: TABLE.WORLD_ITEMS,
			entityId: id,
			operation: "update",
			payload: patch,
		});

		const updated = await this.get(id);
		if (!updated)
			throw new Error(`WorldbuildingEntry ${id} not found after update`);
		return updated;
	}

	async delete(id: string): Promise<void> {
		const existing = await this.get(id);
		if (!existing) return; // idempotent

		const now = new Date().toISOString();
		await this.db.run(
			"UPDATE world_items SET deleted_at = ?, updated_at = ? WHERE id = ?",
			[now, now, id],
		);

		await this.db.insertChange({
			projectId: existing.projectId,
			entityType: TABLE.WORLD_ITEMS,
			entityId: id,
			operation: "delete",
			payload: { id },
		});
	}
}
