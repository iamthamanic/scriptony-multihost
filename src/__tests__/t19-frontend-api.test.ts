/**
 * T19 Tests - Frontend API Layer Integration
 * Verifies that frontend callers for T12/T14/T17 routes stay on the API layer.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JobStatus } from "../lib/jobs/types";

type ApiResultPayload = {
  data?: unknown;
  error?: { message?: string };
};

const apiMocks = vi.hoisted(() => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  clientDelete: vi.fn(),
  clientGet: vi.fn(),
  clientPost: vi.fn(),
  clientPut: vi.fn(),
  unwrapApiResult: vi.fn((result: ApiResultPayload) => {
    if (result.error) {
      throw new Error(result.error.message || "Mock API error");
    }
    return result.data;
  }),
}));

vi.mock("../lib/api-client", () => ({
  apiClient: {
    delete: apiMocks.clientDelete,
    get: apiMocks.clientGet,
    post: apiMocks.clientPost,
    put: apiMocks.clientPut,
  },
  apiDelete: apiMocks.apiDelete,
  apiGet: apiMocks.apiGet,
  apiPost: apiMocks.apiPost,
  apiPut: apiMocks.apiPut,
  unwrapApiResult: apiMocks.unwrapApiResult,
}));

describe("T19 frontend API layer contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes editor read-model loading through apiGet", async () => {
    apiMocks.apiGet.mockResolvedValue({
      data: {
        characters: [],
        clips: [],
        shots: [],
        stats: { acts: 0, characters: 0, clips: 0, scenes: 0, shots: 0 },
        timeline: { acts: [], scenes: [], sequences: [] },
      },
    });

    const { ultraBatchLoadProject } =
      await import("../lib/api/timeline-api-v2");

    await ultraBatchLoadProject("project-1", "token-ignored-by-gateway", {
      excludeContent: true,
    });

    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      "/editor/projects/project-1/state?exclude_content=true",
    );
  });

  it("routes job lifecycle operations through apiClient", async () => {
    apiMocks.clientPost.mockResolvedValueOnce({
      createdAt: "2026-05-01T00:00:00.000Z",
      jobId: "job-1",
      message: "started",
      status: "pending",
    });
    apiMocks.clientGet
      .mockResolvedValueOnce({
        createdAt: "2026-05-01T00:00:00.000Z",
        jobId: "job-1",
        status: "completed",
        updatedAt: "2026-05-01T00:00:01.000Z",
      })
      .mockResolvedValueOnce({ result: { ok: true } });

    const { cancelJob, getJobResult, getJobStatus, startJob } =
      await import("../lib/jobs/jobApi");

    await startJob("style-guide", { projectId: "project-1" });
    await getJobStatus("job-1");
    await getJobResult("job-1");
    await cancelJob("job-1");

    expect(apiMocks.clientPost).toHaveBeenNthCalledWith(
      1,
      "/v1/jobs/style-guide",
      { projectId: "project-1" },
    );
    expect(apiMocks.clientGet).toHaveBeenNthCalledWith(
      1,
      "/v1/jobs/job-1/status",
    );
    expect(apiMocks.clientGet).toHaveBeenNthCalledWith(
      2,
      "/v1/jobs/job-1/result",
    );
    expect(apiMocks.clientPost).toHaveBeenNthCalledWith(
      2,
      "/v1/jobs/job-1/cancel",
      {},
    );
  });

  it("routes world categories through the legacy API wrapper, not component fetch", async () => {
    apiMocks.apiGet.mockResolvedValue({
      data: { categories: [{ id: "category-1" }] },
    });

    const { categoriesApi } = await import("../utils/api");

    await expect(categoriesApi.getAll("world-1")).resolves.toEqual([
      { id: "category-1" },
    ]);
    expect(apiMocks.apiGet).toHaveBeenCalledWith("/worlds/world-1/categories");
  });

  it("keeps the frontend JobStatus union in sync with cancelled jobs", () => {
    const statuses = [
      "pending",
      "processing",
      "completed",
      "failed",
      "cancelled",
    ] satisfies JobStatus[];

    expect(statuses).toContain("cancelled");
  });
});
