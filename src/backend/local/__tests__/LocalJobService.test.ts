/**
 * LocalJobService tests (in-memory SQLite).
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { LocalDb } from "../LocalDb";
import { LocalJobService } from "../LocalJobService";

describe("LocalJobService", () => {
	let db: LocalDb;
	let service: LocalJobService;
	const projectId = "local_test_proj";

	beforeEach(async () => {
		db = await LocalDb.createInMemory();
		await db.run(
			"INSERT INTO projects (id, title, description, project_type, user_id, created_at, updated_at, sync_status) VALUES (?, 'T', '', 'film', 'local-user', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 'local')",
			[projectId],
		);
		service = new LocalJobService(db, projectId);
	});

	afterEach(async () => {
		await db.close();
	});

	it("starts a job and persists it to the jobs table", async () => {
		const response = await service.start("export-pdf", {
			projectId: "test",
			data: "hello",
		});
		expect(response.jobId).toBeTruthy();
		expect(response.status).toBe("pending");

		const status = await service.getStatus(response.jobId);
		expect(status.jobId).toBe(response.jobId);
		expect(status.status).toBe("pending");
	});

	it("getStatus returns pending for unknown job ID", async () => {
		const status = await service.getStatus("nonexistent-id");
		expect(status.jobId).toBe("nonexistent-id");
		expect(status.status).toBe("pending");
	});

	it("getResult throws for non-completed job", async () => {
		const job = await service.start("render", {});
		await expect(service.getResult(job.jobId)).rejects.toThrow(/not completed/);
	});

	it("writes change_log on job creation", async () => {
		await service.start("test-function", { key: "value" });
		const changes = await db.all(
			"SELECT * FROM change_log WHERE entity_type = ?",
			["jobs"],
		);
		expect(changes.length).toBeGreaterThanOrEqual(1);
	});
});
