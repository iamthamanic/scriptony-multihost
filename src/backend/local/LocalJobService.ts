/**
 * LocalJobService — SQLite-backed job queue persistence.
 *
 * T38: Persists job records to the jobs table. Execution is out of scope (T43).
 * Jobs start in 'pending' status. getStatus reads from DB.
 * All queries use parameterised statements (OWASP ASVS 5.x).
 */

import type {
	JobService,
	JobStartResponse,
	JobStatusResponse,
} from "../ScriptonyBackend";
import type { LocalDb } from "./LocalDb";
import { TABLE } from "@/local/project-schema";
import { localId } from "./id";

/** Default project ID used when no project context is available. */
const DEFAULT_PROJECT_ID = "local-default";

export class LocalJobService implements JobService {
	constructor(
		private readonly db: LocalDb,
		private readonly projectId: string = DEFAULT_PROJECT_ID,
	) {}

	async start<TPayload>(
		functionName: string,
		payload: TPayload,
	): Promise<JobStartResponse> {
		const jobId = localId("local");
		const now = new Date().toISOString();

		await this.db.run(
			"INSERT INTO jobs (id, project_id, job_type, status, payload_json, created_at, updated_at) VALUES (?, ?, ?, 'pending', ?, ?, ?)",
			[jobId, this.projectId, functionName, JSON.stringify(payload), now, now],
		);

		await this.db.insertChange({
			projectId: this.projectId,
			entityType: TABLE.JOBS,
			entityId: jobId,
			operation: "create",
			payload: { functionName, jobId },
		});

		return { jobId, status: "pending" };
	}

	async getStatus<TResult>(jobId: string): Promise<JobStatusResponse<TResult>> {
		const row = await this.db.get(
			"SELECT id, status, result_json, error FROM jobs WHERE id = ?",
			[jobId],
		);

		if (!row) {
			return { jobId, status: "pending" as const };
		}

		let result: TResult | undefined;
		if (row.result_json) {
			try {
				result = JSON.parse(row.result_json as string) as TResult;
			} catch {
				result = undefined;
			}
		}

		return {
			jobId: row.id as string,
			status: (row.status as JobStatusResponse["status"]) ?? "pending",
			result,
			error: (row.error as string) ?? undefined,
		};
	}

	async getResult<TResult>(jobId: string): Promise<TResult> {
		const row = await this.db.get(
			"SELECT result_json, status FROM jobs WHERE id = ?",
			[jobId],
		);

		if (!row || row.status !== "completed") {
			throw new Error(
				`LocalJobService: job ${jobId} not completed (status: ${row?.status ?? "unknown"})`,
			);
		}

		try {
			return JSON.parse(row.result_json as string) as TResult;
		} catch {
			throw new Error(
				`LocalJobService: failed to parse result for job ${jobId}`,
			);
		}
	}
}
