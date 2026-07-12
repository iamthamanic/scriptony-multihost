/**
 * Tests for T14 jobWorker business logic
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdateDocument = vi.fn();

beforeEach(() => {
  mockUpdateDocument.mockClear();
});

vi.mock("../../_shared/appwrite-db", () => ({
  updateDocument: (...args: unknown[]) => mockUpdateDocument(...args),
}));

const {
  extractJobContext,
  stripJobFields,
  reportJobProgress,
  completeJob,
  failJob,
  wrapWithJobReporting,
} = await import("../../_shared/jobs/jobWorker");

describe("extractJobContext", () => {
  it("returns context when __jobId present", () => {
    const ctx = extractJobContext({ __jobId: "j1", __userId: "u1", foo: 1 });
    expect(ctx?.jobId).toBe("j1");
    expect(ctx?.userId).toBe("u1");
    expect(ctx?.isJob).toBe(true);
  });

  it("returns null when __jobId missing", () => {
    expect(extractJobContext({ foo: 1 })).toBeNull();
  });
});

describe("stripJobFields", () => {
  it("removes __jobId and __userId", () => {
    const stripped = stripJobFields({ __jobId: "j1", __userId: "u1", foo: 1 });
    expect(stripped).toEqual({ foo: 1 });
  });
});

describe("reportJobProgress", () => {
  it("clamps progress to 0-100", async () => {
    mockUpdateDocument.mockResolvedValueOnce({});
    await reportJobProgress("j1", 150);
    expect(mockUpdateDocument).toHaveBeenCalledWith(
      "jobs",
      "j1",
      expect.objectContaining({ progress: 100 }),
    );
  });

  it("throws on DB error so caller knows", async () => {
    mockUpdateDocument.mockRejectedValueOnce(new Error("DB down"));
    await expect(reportJobProgress("j1", 50)).rejects.toThrow("DB down");
  });
});

describe("completeJob", () => {
  it("sets status completed with result JSON", async () => {
    mockUpdateDocument.mockResolvedValueOnce({});
    await completeJob("j1", { url: "http://x" });
    const call = mockUpdateDocument.mock.calls[0];
    expect(call[2]).toEqual(
      expect.objectContaining({
        status: "completed",
        result_json: JSON.stringify({ url: "http://x" }),
      }),
    );
  });
});

describe("failJob", () => {
  it("truncates error to 2000 chars", async () => {
    mockUpdateDocument.mockResolvedValueOnce({});
    const longError = "x".repeat(3000);
    await failJob("j1", longError);
    const call = mockUpdateDocument.mock.calls[0];
    expect((call[2] as Record<string, unknown>).error).toHaveLength(2000);
  });
});

describe("wrapWithJobReporting", () => {
  it("passes through when not a job", async () => {
    const result = await wrapWithJobReporting(null, async () => "ok");
    expect(result).toBe("ok");
    expect(mockUpdateDocument).not.toHaveBeenCalled();
  });

  it("marks processing, runs op, marks completed", async () => {
    mockUpdateDocument.mockResolvedValue({});
    const result = await wrapWithJobReporting(
      { jobId: "j1", userId: "u1", isJob: true },
      async (report) => {
        report(50);
        return "done";
      },
    );
    expect(result).toBe("done");
    expect(mockUpdateDocument).toHaveBeenCalledTimes(3); // start + progress + complete
  });

  it("marks failed and throws original error even if failJob fails", async () => {
    mockUpdateDocument
      .mockResolvedValueOnce({}) // start
      .mockRejectedValueOnce(new Error("failJob DB error")); // failJob throws

    await expect(
      wrapWithJobReporting(
        { jobId: "j1", userId: "u1", isJob: true },
        async () => {
          throw new Error("original worker error");
        },
      ),
    ).rejects.toThrow("original worker error");
  });

  it("does NOT abort operation when progress report fails", async () => {
    mockUpdateDocument
      .mockResolvedValueOnce({}) // start
      .mockRejectedValueOnce(new Error("progress DB error")) // progress fails
      .mockResolvedValueOnce({}); // complete succeeds

    const result = await wrapWithJobReporting(
      { jobId: "j1", userId: "u1", isJob: true },
      async (report) => {
        report(50); // this will fail silently
        return "survived";
      },
    );
    expect(result).toBe("survived");
  });
});
