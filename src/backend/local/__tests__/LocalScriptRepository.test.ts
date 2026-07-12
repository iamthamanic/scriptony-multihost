/**
 * LocalScriptRepository tests (in-memory SQLite).
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { LocalDb } from "../LocalDb";
import { LocalScriptRepository } from "../LocalScriptRepository";
import { TABLE } from "@/local/project-schema";

describe("LocalScriptRepository", () => {
	let db: LocalDb;
	let repo: LocalScriptRepository;
	const projectId = "local_test_proj";

	beforeEach(async () => {
		db = await LocalDb.createInMemory();
		await db.run(
			"INSERT INTO projects (id, title, description, project_type, user_id, created_at, updated_at, sync_status) VALUES (?, 'T', '', 'film', 'local-user', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 'local')",
			[projectId],
		);
		repo = new LocalScriptRepository(db);
	});

	afterEach(async () => {
		await db.close();
	});

	it("creates a script block and reads it back", async () => {
		const script = await repo.create({
			projectId,
			containerId: "node-1",
			content: "INT. ROOM - DAY",
			format: "fountain",
			version: 1,
		});
		expect(script.id).toBeTruthy();
		expect(script.projectId).toBe(projectId);
		expect(script.content).toBe("INT. ROOM - DAY");
		expect(script.format).toBe("fountain");

		const fetched = await repo.get(script.id);
		expect(fetched).not.toBeNull();
		expect(fetched!.content).toBe("INT. ROOM - DAY");
	});

	it("lists scripts by project", async () => {
		await repo.create({
			projectId,
			containerId: "n1",
			content: "A",
			format: "fountain",
			version: 1,
		});
		await repo.create({
			projectId,
			containerId: "n2",
			content: "B",
			format: "markdown",
			version: 1,
		});

		const list = await repo.getByProject(projectId);
		expect(list).toHaveLength(2);
	});

	it("updates a script block and writes change_log", async () => {
		const script = await repo.create({
			projectId,
			containerId: "n1",
			content: "Old",
			format: "fountain",
			version: 1,
		});
		const updated = await repo.update(script.id, { content: "New content" });
		expect(updated.content).toBe("New content");
		expect(updated.version).toBe(2); // version incremented

		const changes = await db.all(
			"SELECT * FROM change_log WHERE entity_id = ?",
			[script.id],
		);
		expect(changes.length).toBeGreaterThanOrEqual(2); // create + update
	});

	it("soft-deletes a script block", async () => {
		const script = await repo.create({
			projectId,
			containerId: "n1",
			content: "Del",
			format: "fountain",
			version: 1,
		});
		await repo.delete(script.id);
		const found = await repo.get(script.id);
		expect(found).toBeNull();
	});

	it("rejects create without containerId", async () => {
		await expect(
			repo.create({
				projectId,
				content: "X",
				format: "fountain",
				version: 1,
			} as any),
		).rejects.toThrow(/containerId/);
	});
});
