/**
 * LocalScriptRepository — SQLite-backed script block persistence.
 *
 * T38: CRUD for script_blocks table with soft delete and change_log.
 * All queries use parameterised statements (OWASP ASVS 5.x).
 */

import type { Script, ScriptRepository } from "../ScriptonyBackend";
import type { LocalDb } from "./LocalDb";
import type { BindParams } from "sql.js";
import { TABLE } from "@/local/project-schema";
import { mapScriptRow } from "./mappers";
import { localId } from "./id";

export class LocalScriptRepository implements ScriptRepository {
	constructor(private readonly db: LocalDb) {}

	async get(id: string): Promise<Script | null> {
		const row = await this.db.get(
			"SELECT * FROM script_blocks WHERE id = ? AND deleted_at IS NULL",
			[id],
		);
		return row ? mapScriptRow(row) : null;
	}

	async getByProject(projectId: string): Promise<Script[]> {
		const rows = await this.db.all(
			"SELECT * FROM script_blocks WHERE project_id = ? AND deleted_at IS NULL ORDER BY created_at ASC",
			[projectId],
		);
		return rows.map(mapScriptRow);
	}

	async create(
		payload: Omit<Script, "id" | "createdAt" | "updatedAt">,
	): Promise<Script> {
		const containerId = payload.containerId?.trim();
		if (!containerId) {
			throw new Error(
				"Script containerId (node_id) is required for local script blocks",
			);
		}
		const now = new Date().toISOString();
		const id = localId("local");
		const result: Script = {
			...payload,
			containerId,
			id,
			createdAt: now,
			updatedAt: now,
		};

		await this.db.run(
			"INSERT INTO script_blocks (id, project_id, node_id, content, format, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
			[
				result.id,
				result.projectId,
				containerId,
				result.content ?? "",
				result.format ?? "fountain",
				result.version ?? 1,
				result.createdAt,
				result.updatedAt,
			],
		);

		await this.db.insertChange({
			projectId: result.projectId,
			entityType: TABLE.SCRIPT_BLOCKS,
			entityId: result.id,
			operation: "create",
			payload: result,
		});

		return result;
	}

	async update(id: string, patch: Partial<Script>): Promise<Script> {
		const existing = await this.get(id);
		if (!existing) throw new Error(`Script ${id} not found`);

		const now = new Date().toISOString();
		// Column names are all hardcoded — not derived from user input (OWASP ASVS 5.x)
		const values: BindParams = [];
		const setParts: string[] = [];

		if (patch.containerId !== undefined) {
			setParts.push("node_id = ?");
			values.push(patch.containerId ?? null);
		}
		if (patch.content !== undefined) {
			setParts.push("content = ?");
			values.push(patch.content);
		}
		if (patch.format !== undefined) {
			setParts.push("format = ?");
			values.push(patch.format);
		}

		setParts.push("version = version + 1");
		setParts.push("updated_at = ?");
		values.push(now);
		values.push(id);

		await this.db.run(
			"UPDATE script_blocks SET " + setParts.join(", ") + " WHERE id = ?",
			values,
		);

		await this.db.insertChange({
			projectId: existing.projectId,
			entityType: TABLE.SCRIPT_BLOCKS,
			entityId: id,
			operation: "update",
			payload: patch,
		});

		const updated = await this.get(id);
		if (!updated) throw new Error(`Script ${id} not found after update`);
		return updated;
	}

	async delete(id: string): Promise<void> {
		const existing = await this.get(id);
		if (!existing) return; // idempotent

		const now = new Date().toISOString();
		await this.db.run(
			"UPDATE script_blocks SET deleted_at = ?, updated_at = ? WHERE id = ?",
			[now, now, id],
		);

		await this.db.insertChange({
			projectId: existing.projectId,
			entityType: TABLE.SCRIPT_BLOCKS,
			entityId: id,
			operation: "delete",
			payload: { id },
		});
	}
}
