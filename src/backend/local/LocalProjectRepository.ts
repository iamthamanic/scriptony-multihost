/**
 * LocalProjectRepository — SQLite-backed project persistence.
 *
 * T38: Replaces the in-memory stub with real SQLite read/write.
 * Soft-deletes via deleted_at. Mutations write change_log entries.
 * All queries use parameterised statements (OWASP ASVS 5.x).
 */

import type {
	Project,
	ProjectRepository,
	CreateProjectPayload,
	UpdateProjectPayload,
} from "../ScriptonyBackend";
import type { LocalDb } from "./LocalDb";
import { TABLE } from "@/local/project-schema";
import { mapProjectRow, projectToRow } from "./mappers";
import type { BindParams, SqlValue } from "sql.js";

export class LocalProjectRepository implements ProjectRepository {
	constructor(private readonly db: LocalDb) {}

	async list(): Promise<Project[]> {
		const rows = await this.db.all(
			"SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY created_at DESC",
		);
		return rows.map(mapProjectRow);
	}

	async get(id: string): Promise<Project | null> {
		const row = await this.db.get(
			"SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL",
			[id],
		);
		return row ? mapProjectRow(row) : null;
	}

	async create(_payload: CreateProjectPayload): Promise<Project> {
		throw new Error(
			"Local projects are created via createProjectFolder() / LocalProjectContext.create(), not ProjectRepository.create().",
		);
	}

	async update(id: string, payload: UpdateProjectPayload): Promise<Project> {
		const existing = await this.get(id);
		if (!existing) throw new Error(`Project ${id} not found`);

		const now = new Date().toISOString();
		// Column names below are all hardcoded string literals, not user input.
		// This avoids dynamic string building in SQL (OWASP ASVS 5.x).
		const values: BindParams = [];

		const nameClause = payload.name !== undefined ? "title = ?" : null;
		if (payload.name !== undefined) values.push(payload.name);

		const descClause =
			payload.description !== undefined ? "description = ?" : null;
		if (payload.description !== undefined)
			values.push(payload.description ?? "");

		const typeClause =
			payload.projectType !== undefined ? "project_type = ?" : null;
		if (payload.projectType !== undefined)
			values.push(payload.projectType ?? "");

		const setParts: string[] = [];
		if (nameClause) setParts.push(nameClause);
		if (descClause) setParts.push(descClause);
		if (typeClause) setParts.push(typeClause);
		setParts.push("updated_at = ?");
		values.push(now);

		values.push(id);

		const setSql = setParts.join(", ");

		await this.db.run(
			"UPDATE projects SET " + setSql + " WHERE id = ?",
			values,
		);

		await this.db.insertChange({
			projectId: id,
			entityType: TABLE.PROJECTS,
			entityId: id,
			operation: "update",
			payload,
		});

		const updated = await this.get(id);
		if (!updated) throw new Error(`Project ${id} not found after update`);
		return updated;
	}

	async delete(id: string): Promise<void> {
		const existing = await this.get(id);
		if (!existing) return; // idempotent

		const now = new Date().toISOString();
		await this.db.run(
			"UPDATE projects SET deleted_at = ?, updated_at = ? WHERE id = ?",
			[now, now, id],
		);

		await this.db.insertChange({
			projectId: id,
			entityType: TABLE.PROJECTS,
			entityId: id,
			operation: "delete",
			payload: { id },
		});
	}
}
