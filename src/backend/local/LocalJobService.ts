/**
 * LocalJobService
 *
 * T35: Stub — wirft bei Start, da lokal nicht unterstützt.
 */

import type { JobService, JobStartResponse, JobStatusResponse } from "../ScriptonyBackend";

export class LocalJobService implements JobService {
	async start<TPayload>(
		functionName: string,
		_payload: TPayload,
	): Promise<JobStartResponse> {
		return { jobId: `local-${functionName}-${Date.now()}`, status: "completed" };
	}

	async getStatus<TResult>(
		jobId: string,
	): Promise<JobStatusResponse<TResult>> {
		return { jobId, status: "completed" };
	}

	async getResult<TResult>(): Promise<TResult> {
		throw new Error("LocalJobService.getResult not implemented");
	}
}
