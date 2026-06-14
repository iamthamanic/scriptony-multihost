import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetBeats = vi.fn();
const mockDeleteBeat = vi.fn();
const mockCreateBeat = vi.fn();
const mockGetActs = vi.fn();

vi.mock("@/lib/api/beats-api", () => ({
  getBeats: (...args: unknown[]) => mockGetBeats(...args),
  deleteBeat: (...args: unknown[]) => mockDeleteBeat(...args),
  createBeat: (...args: unknown[]) => mockCreateBeat(...args),
}));

vi.mock("@/lib/api/timeline-api", () => ({
  getActs: (...args: unknown[]) => mockGetActs(...args),
}));

import {
  applyBeatTemplateToProject,
  isRegistryBeatTemplateKey,
  resolveRegistryBeatTemplate,
} from "./apply-beat-template";

describe("resolveRegistryBeatTemplate", () => {
  it("returns template for registry keys", () => {
    expect(resolveRegistryBeatTemplate("lite-7")?.id).toBe("lite-7");
    expect(resolveRegistryBeatTemplate("save-the-cat")?.id).toBe(
      "save-the-cat",
    );
  });

  it("returns null for custom and empty", () => {
    expect(resolveRegistryBeatTemplate("custom:my")).toBeNull();
    expect(resolveRegistryBeatTemplate("custom")).toBeNull();
    expect(resolveRegistryBeatTemplate("")).toBeNull();
    expect(resolveRegistryBeatTemplate("unknown-xyz")).toBeNull();
  });

  it("isRegistryBeatTemplateKey matches registry only", () => {
    expect(isRegistryBeatTemplateKey("heroes-journey")).toBe(true);
    expect(isRegistryBeatTemplateKey("custom:foo")).toBe(false);
  });
});

describe("applyBeatTemplateToProject", () => {
  beforeEach(() => {
    mockGetBeats.mockReset();
    mockDeleteBeat.mockReset();
    mockCreateBeat.mockReset();
    mockGetActs.mockReset();
    mockGetActs.mockResolvedValue([]);
    mockCreateBeat.mockImplementation(async (payload: { label: string }) => ({
      id: `beat-${payload.label}`,
      project_id: "proj_1",
      user_id: "u1",
      label: payload.label,
      from_container_id: "a1",
      to_container_id: "a3",
      pct_from: 0,
      pct_to: 10,
      order_index: 0,
      created_at: "",
      updated_at: "",
    }));
  });

  it("skips empty key without API calls for delete/create", async () => {
    const result = await applyBeatTemplateToProject("proj_1", "  ");
    expect(result).toEqual({ kind: "skipped", reason: "empty-key" });
    expect(mockDeleteBeat).not.toHaveBeenCalled();
    expect(mockCreateBeat).not.toHaveBeenCalled();
  });

  it("deletes existing beats and creates from lite-7 template", async () => {
    mockGetBeats.mockResolvedValueOnce([
      {
        id: "old-1",
        project_id: "proj_1",
        user_id: "u1",
        label: "Old",
        from_container_id: "a",
        to_container_id: "b",
        pct_from: 0,
        pct_to: 1,
        order_index: 0,
        created_at: "",
        updated_at: "",
      },
    ]);

    const result = await applyBeatTemplateToProject("proj_1", "lite-7");

    expect(mockDeleteBeat).toHaveBeenCalledWith("old-1");
    expect(mockCreateBeat.mock.calls.length).toBeGreaterThan(0);
    expect(result.kind).toBe("created");
    if (result.kind === "created") {
      expect(result.templateId).toBe("lite-7");
      expect(result.count).toBeGreaterThan(0);
    }
  });

  it("clears beats for custom template without creating new ones", async () => {
    mockGetBeats.mockResolvedValueOnce([
      {
        id: "b1",
        project_id: "proj_1",
        user_id: "u1",
        label: "X",
        from_container_id: "a",
        to_container_id: "b",
        pct_from: 0,
        pct_to: 1,
        order_index: 0,
        created_at: "",
        updated_at: "",
      },
    ]);

    const result = await applyBeatTemplateToProject(
      "proj_1",
      "custom:my-structure",
    );

    expect(mockDeleteBeat).toHaveBeenCalledWith("b1");
    expect(mockCreateBeat).not.toHaveBeenCalled();
    expect(result).toEqual({ kind: "cleared-custom", deletedCount: 1 });
  });

  it("uses act ids when timeline has acts", async () => {
    mockGetBeats.mockResolvedValueOnce([]);
    mockGetActs.mockResolvedValueOnce([
      { id: "act-first" },
      { id: "act-last" },
    ]);

    await applyBeatTemplateToProject("proj_1", "lite-7");

    expect(mockCreateBeat.mock.calls[0]?.[0]).toMatchObject({
      from_container_id: "act-first",
      to_container_id: "act-last",
    });
  });
});
