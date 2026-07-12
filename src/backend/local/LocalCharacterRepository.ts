/**
 * LocalCharacterRepository — SQLite-backed character persistence.
 *
 * T38: CRUD for characters table with soft delete and change_log.
 * All queries use parameterised statements (OWASP ASVS 5.x).
 */

import type { CharacterRepository } from "../ScriptonyBackend";
import type { Character } from "@/lib/types";
import type { LocalDb } from "./LocalDb";
import type { BindParams } from "sql.js";
import { TABLE } from "@/local/project-schema";
import { mapCharacterRow } from "./mappers";
import { localId } from "./id";

export class LocalCharacterRepository implements CharacterRepository {
	constructor(private readonly db: LocalDb) {}

	async list(projectId: string): Promise<Character[]> {
		const rows = await this.db.all(
			"SELECT * FROM characters WHERE project_id = ? AND deleted_at IS NULL ORDER BY created_at ASC",
			[projectId],
		);
		return rows.map(mapCharacterRow);
	}

	async get(id: string): Promise<Character | null> {
		const row = await this.db.get(
			"SELECT * FROM characters WHERE id = ? AND deleted_at IS NULL",
			[id],
		);
		return row ? mapCharacterRow(row) : null;
	}

	async create(
		projectId: string,
		payload: Partial<Character>,
	): Promise<Character> {
		const now = new Date().toISOString();
		const id = localId("local");
		const character: Character = {
			id,
			projectId,
			name: payload.name ?? "Unnamed Character",
			role: payload.role ?? "supporting",
			description: payload.description,
			age: payload.age,
			imageUrl: payload.imageUrl,
			traits: payload.traits,
			backstory: payload.backstory,
			gender: payload.gender,
			createdAt: now,
			updatedAt: now,
		};

		await this.db.run(
			"INSERT INTO characters (id, project_id, name, role, description, age, image_url, traits_json, backstory, gender, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			[
				character.id,
				character.projectId,
				character.name,
				character.role ?? "supporting",
				character.description ?? "",
				character.age ?? null,
				character.imageUrl ?? null,
				JSON.stringify(character.traits ?? []),
				character.backstory ?? "",
				character.gender ?? null,
				character.createdAt,
				character.updatedAt,
			],
		);

		await this.db.insertChange({
			projectId,
			entityType: TABLE.CHARACTERS,
			entityId: character.id,
			operation: "create",
			payload: character,
		});

		return character;
	}

	async update(id: string, patch: Partial<Character>): Promise<Character> {
		const existing = await this.get(id);
		if (!existing) throw new Error(`Character ${id} not found`);

		const now = new Date().toISOString();
		// Column names are all hardcoded — not derived from user input (OWASP ASVS 5.x)
		const values: BindParams = [];
		const setParts: string[] = [];

		if (patch.name !== undefined) {
			setParts.push("name = ?");
			values.push(patch.name);
		}
		if (patch.role !== undefined) {
			setParts.push("role = ?");
			values.push(patch.role);
		}
		if (patch.description !== undefined) {
			setParts.push("description = ?");
			values.push(patch.description ?? "");
		}
		if (patch.age !== undefined) {
			setParts.push("age = ?");
			values.push(patch.age ?? null);
		}
		if (patch.imageUrl !== undefined) {
			setParts.push("image_url = ?");
			values.push(patch.imageUrl ?? null);
		}
		if (patch.traits !== undefined) {
			setParts.push("traits_json = ?");
			values.push(JSON.stringify(patch.traits));
		}
		if (patch.backstory !== undefined) {
			setParts.push("backstory = ?");
			values.push(patch.backstory ?? "");
		}
		if (patch.gender !== undefined) {
			setParts.push("gender = ?");
			values.push(patch.gender ?? null);
		}

		setParts.push("updated_at = ?");
		values.push(now);
		values.push(id);

		await this.db.run(
			"UPDATE characters SET " + setParts.join(", ") + " WHERE id = ?",
			values,
		);

		await this.db.insertChange({
			projectId: existing.projectId,
			entityType: TABLE.CHARACTERS,
			entityId: id,
			operation: "update",
			payload: patch,
		});

		const updated = await this.get(id);
		if (!updated) throw new Error(`Character ${id} not found after update`);
		return updated;
	}

	async delete(id: string): Promise<void> {
		const existing = await this.get(id);
		if (!existing) return; // idempotent

		const now = new Date().toISOString();
		await this.db.run(
			"UPDATE characters SET deleted_at = ?, updated_at = ? WHERE id = ?",
			[now, now, id],
		);

		await this.db.insertChange({
			projectId: existing.projectId,
			entityType: TABLE.CHARACTERS,
			entityId: id,
			operation: "delete",
			payload: { id },
		});
	}
}
