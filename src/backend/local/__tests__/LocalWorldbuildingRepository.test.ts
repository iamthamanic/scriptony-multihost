/**
 * LocalWorldbuildingRepository tests (in-memory SQLite).
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { LocalDb } from "../LocalDb";
import { LocalWorldbuildingRepository } from "../LocalWorldbuildingRepository";
import { TABLE } from "@/local/project-schema";

describe("LocalWorldbuildingRepository", () => {
	let db: LocalDb;
	let repo: LocalWorldbuildingRepository;
	const projectId = "local_test_proj";

	beforeEach(async () => {
		db = await LocalDb.createInMemory();
		await db.run(
			"INSERT INTO projects (id, title, description, project_type, user_id, created_at, updated_at, sync_status) VALUES (?, 'T', '', 'film', 'local-user', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 'local')",
			[projectId],
		);
		repo = new LocalWorldbuildingRepository(db);
	});

	afterEach(async () => {
		await db.close();
	});

	it("creates a worldbuilding entry and reads it back", async () => {
		const entry = await repo.create(projectId, {
			category: "geography",
			label: "The Northern Mountains",
			content: "A vast mountain range...",
		});
		expect(entry.id).toBeTruthy();
		expect(entry.label).toBe("The Northern Mountains");
		expect(entry.category).toBe("geography");

		const fetched = await repo.get(entry.id);
		expect(fetched).not.toBeNull();
		expect(fetched!.label).toBe("The Northern Mountains");
	});

	it("lists worldbuilding entries by project", async () => {
		await repo.create(projectId, { category: "geography", label: "Mountains" });
		await repo.create(projectId, {
			category: "culture",
			label: "Elven Traditions",
		});

		const list = await repo.list(projectId);
		expect(list).toHaveLength(2);
	});

	it("updates a worldbuilding entry", async () => {
		const entry = await repo.create(projectId, {
			category: "history",
			label: "The Great War",
		});
		const updated = await repo.update(entry.id, {
			label: "The First Great War",
			content: "Updated content",
		});
		expect(updated.label).toBe("The First Great War");
		expect(updated.content).toBe("Updated content");
	});

	it("writes change_log on update", async () => {
		const entry = await repo.create(projectId, { label: "Magic System" });
		await repo.update(entry.id, { content: "Detailed magic system" });

		const changes = await db.all(
			"SELECT * FROM change_log WHERE entity_id = ?",
			[entry.id],
		);
		expect(changes.length).toBeGreaterThanOrEqual(2); // create + update
	});

	it("soft-deletes a worldbuilding entry", async () => {
		const entry = await repo.create(projectId, { label: "To Delete" });
		await repo.delete(entry.id);
		const found = await repo.get(entry.id);
		expect(found).toBeNull();
	});

	it("defaults category and label when not provided", async () => {
		const entry = await repo.create(projectId, {});
		expect(entry.label).toBe("Untitled");
		expect(entry.category).toBe("custom");
	});
});
