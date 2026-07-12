/**
 * LocalCharacterRepository tests (in-memory SQLite).
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { LocalDb } from "../LocalDb";
import { LocalCharacterRepository } from "../LocalCharacterRepository";
import { TABLE } from "@/local/project-schema";

describe("LocalCharacterRepository", () => {
	let db: LocalDb;
	let repo: LocalCharacterRepository;
	const projectId = "local_test_proj";

	beforeEach(async () => {
		db = await LocalDb.createInMemory();
		await db.run(
			"INSERT INTO projects (id, title, description, project_type, user_id, created_at, updated_at, sync_status) VALUES (?, 'T', '', 'film', 'local-user', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 'local')",
			[projectId],
		);
		repo = new LocalCharacterRepository(db);
	});

	afterEach(async () => {
		await db.close();
	});

	it("creates a character and reads it back", async () => {
		const char = await repo.create(projectId, {
			name: "Alice",
			role: "protagonist",
			description: "The hero",
			traits: ["brave", "kind"],
		});
		expect(char.id).toBeTruthy();
		expect(char.name).toBe("Alice");
		expect(char.role).toBe("protagonist");
		expect(char.traits).toEqual(["brave", "kind"]);

		const fetched = await repo.get(char.id);
		expect(fetched).not.toBeNull();
		expect(fetched!.name).toBe("Alice");
	});

	it("lists characters by project", async () => {
		await repo.create(projectId, { name: "Alice" });
		await repo.create(projectId, { name: "Bob" });

		const list = await repo.list(projectId);
		expect(list).toHaveLength(2);
	});

	it("updates a character", async () => {
		const char = await repo.create(projectId, { name: "Eve" });
		const updated = await repo.update(char.id, {
			name: "Eve Updated",
			backstory: "A mystery",
		});
		expect(updated.name).toBe("Eve Updated");
		expect(updated.backstory).toBe("A mystery");
	});

	it("writes change_log on update", async () => {
		const char = await repo.create(projectId, { name: "LogTest" });
		await repo.update(char.id, { name: "LogTest Updated" });

		const changes = await db.all(
			"SELECT * FROM change_log WHERE entity_id = ?",
			[char.id],
		);
		expect(changes.length).toBeGreaterThanOrEqual(2);
	});

	it("soft-deletes a character", async () => {
		const char = await repo.create(projectId, { name: "ToDelete" });
		await repo.delete(char.id);
		const found = await repo.get(char.id);
		expect(found).toBeNull();
	});

	it("defaults name and role when not provided", async () => {
		const char = await repo.create(projectId, {});
		expect(char.name).toBe("Unnamed Character");
		expect(char.role).toBe("supporting");
	});
});
