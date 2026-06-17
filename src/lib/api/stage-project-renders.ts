/**
 * Project-level render job listing (T88).
 * Location: src/lib/api/stage-project-renders.ts
 */

import { listRenderJobs } from "./stage-api";
import { getAllShotsByProject } from "@/lib/api-adapter/shots-adapter";
import type { RenderJob } from "../types";
import { apiGet, unwrapApiResult } from "../api-client";

export interface ProjectRenderJobRow extends RenderJob {
  shotLabel?: string;
}

export async function listProjectRenderJobs(
  projectId: string,
  accessToken?: string,
): Promise<ProjectRenderJobRow[]> {
  try {
    const result = await apiGet<{ jobs: RenderJob[] }>(
      `/stage/render-jobs?projectId=${encodeURIComponent(projectId)}`,
    );
    const data = unwrapApiResult(result);
    const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
    if (jobs.length === 0) return [];

    const shots = await getAllShotsByProject(projectId, accessToken);
    const labelByShot = new Map(
      shots.map((s) => [s.id, s.description || `Shot ${s.shotNumber}`]),
    );

    return jobs.map((job) => ({
      ...job,
      shotLabel: labelByShot.get(job.shotId) ?? job.shotId,
    }));
  } catch {
    const shots = await getAllShotsByProject(projectId, accessToken);
    if (shots.length === 0) return [];

    const batches = await Promise.all(
      shots.map(async (shot) => {
        try {
          const jobs = await listRenderJobs(shot.id);
          return jobs.map((job) => ({
            ...job,
            shotLabel: shot.description || `Shot ${shot.shotNumber}`,
          }));
        } catch {
          return [];
        }
      }),
    );

    return batches
      .flat()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }
}
