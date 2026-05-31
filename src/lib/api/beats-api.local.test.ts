import { beforeEach, describe, expect, it, vi } from "vitest";

const mockList = vi.fn(
  async (): Promise<import("./beats-api").StoryBeat[]> => [],
);
const mockCreate = vi.fn(async () => ({
  id: "beat_1",
  project_id: "proj_1",
  user_id: "local-user",
  label: "Test",
  from_container_id: "a1",
  to_container_id: "a3",
  pct_from: 0,
  pct_to: 10,
  order_index: 0,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
}));

vi.mock("@/lib/api-adapter/runtime-dispatch", () => ({
  isLocalProfile: vi.fn(() => true),
  getOpenLocalProjectId: vi.fn(() => "proj_1"),
  requireLocalBackend: vi.fn(() => ({
    beats: {
      list: mockList,
      create: mockCreate,
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  })),
}));

import { createBeat, getBeats } from "./beats-api";

describe("beats-api local", () => {
  beforeEach(() => {
    mockList.mockClear();
    mockCreate.mockClear();
  });

  it("getBeats uses local repository when project is open", async () => {
    mockList.mockResolvedValueOnce([
      {
        id: "b1",
        project_id: "proj_1",
        user_id: "local-user",
        label: "Beat",
        from_container_id: "a",
        to_container_id: "b",
        pct_from: 0,
        pct_to: 1,
        order_index: 0,
        created_at: "",
        updated_at: "",
      },
    ]);
    const beats = await getBeats("proj_1");
    expect(mockList).toHaveBeenCalledWith("proj_1");
    expect(beats).toHaveLength(1);
  });

  it("createBeat delegates to local repository", async () => {
    const beat = await createBeat({
      project_id: "proj_1",
      label: "Opening",
      from_container_id: "act-1",
      to_container_id: "act-3",
    });
    expect(mockCreate).toHaveBeenCalled();
    expect(beat.id).toBe("beat_1");
  });
});
