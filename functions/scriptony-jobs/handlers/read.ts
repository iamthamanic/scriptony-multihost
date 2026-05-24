/**
 * T14 Job Handlers — Create, Status, Result.
 */

import { z } from "zod";
import { requireAuth } from "../../_shared/auth-http";
import {
	type RequestLike,
	type ResponseLike,
	readJsonBody,
	sendJson,
	sendServerError,
} from "../../_shared/http";
import { requireJobOwner } from "../_shared/job-auth";
import {
	createJobEntry,
	failJobDoc,
	getJobById,
	triggerFunctionExecution,
} from "../_shared/job-service";
import { SUPPORTED_JOBS } from "../config/supported-jobs";

const JobCreateBody = z.object({
	payload: z.record(z.unknown()).default({}),
});

export async function handleCreateJob(
	req: RequestLike,
	res: ResponseLike,
	functionName: string,
): Promise<void> {
	const user = await requireAuth(req, res);
	if (!user) return;

	const config = SUPPORTED_JOBS[functionName];
	if (!config) {
		sendJson(res, 422, { error: `Unknown job type: ${functionName}` });
		return;
	}

	const parsed = JobCreateBody.safeParse(await readJsonBody(req));
	if (!parsed.success) {
		sendJson(res, 400, {
			error: "Invalid request body",
			details: parsed.error.issues,
		});
		return;
	}

	try {
		const job = await createJobEntry(
			functionName,
			parsed.data.payload,
			user.id,
		);

		// Intentionally fire-and-forget: we return 201 immediately.
		// The catch handler ensures zombie jobs are marked failed even if
		// the serverless runtime freezes after the HTTP response.
		void (async () => {
			try {
				await triggerFunctionExecution(
					config.functionId,
					job.$id,
					parsed.data.payload,
					user.id,
				);
			} catch (err: unknown) {
				try {
					const msg = err instanceof Error ? err.message : String(err);
					console.error("[jobs] trigger failed:", {
						jobId: job.$id,
						error: err,
					});
					// Avoid zombie jobs: mark as failed so client stops polling
					await failJobDoc(job.$id, `Trigger failed: ${msg}`);
				} catch (innerErr) {
					console.error("[jobs] failJobDoc also failed:", {
						jobId: job.$id,
						error: innerErr,
					});
				}
			}
		})();

		sendJson(res, 201, {
			jobId: job.$id,
			status: "pending",
			message: `Job queued for ${functionName}`,
			createdAt: job.createdAt,
		});
	} catch (error) {
		sendServerError(res, error);
	}
}

export async function handleGetStatus(
	req: RequestLike,
	res: ResponseLike,
	jobId: string,
): Promise<void> {
	const result = await requireJobOwner(req, res, jobId);
	if (!result) return;

	const { job } = result;
	sendJson(res, 200, {
		success: true,
		jobId: job.$id,
		status: job.status,
		progress: job.progress ?? 0,
		result: job.result,
		error: job.error,
		createdAt: job.createdAt,
		updatedAt: job.updatedAt,
	});
}

export async function handleGetResult(
	req: RequestLike,
	res: ResponseLike,
	jobId: string,
): Promise<void> {
	const result = await requireJobOwner(req, res, jobId);
	if (!result) return;

	const { job } = result;

	if (job.status === "pending" || job.status === "processing") {
		sendJson(res, 202, {
			success: false,
			error: "Job still processing",
			status: job.status,
			progress: job.progress ?? 0,
		});
		return;
	}

	if (job.status === "failed") {
		sendJson(res, 500, {
			success: false,
			error: job.error || "Job failed",
			status: "failed",
		});
		return;
	}

	sendJson(res, 200, {
		success: true,
		result: job.result,
		completedAt: job.updatedAt,
	});
}
