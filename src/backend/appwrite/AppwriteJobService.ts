/**
 * AppwriteJobService
 *
 * Nutzt existierendes src/lib/jobs/jobApi.ts.
 * T35: Kein duplizierter HTTP-Code.
 */

import type { JobService, JobStartResponse, JobStatusResponse } from "../ScriptonyBackend";
import { startJob, getJobStatus, getJobResult } from "@/lib/jobs/jobApi";

export class AppwriteJobService implements JobService {
	async start<TPayload>(
		functionName: string,
		payload: TPayload,
	): Promise<JobStartResponse> {
		return startJob(functionName, payload);
	}

	async getStatus<TResult>(
		jobId: string,
	): Promise<JobStatusResponse<TResult>> {
		return getJobStatus(jobId);
	}

	async getResult<TResult>(jobId: string): Promise<TResult> {
		return getJobResult(jobId);
	}
}
