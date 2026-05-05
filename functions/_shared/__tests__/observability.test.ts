/**
 * T16 Tests fuer _shared/observability.ts
 */

import { describe, expect, it, vi } from "vitest";

const mockRequestGraphql = vi.fn();

vi.mock("../graphql-compat", () => ({
  requestGraphql: (...args: unknown[]) => mockRequestGraphql(...args),
}));

const {
  toDurationSeconds,
  countBy,
  getNodeContext,
  getProjectStatsPayload,
  getShotCharacterCounts,
} = await import("../observability");

describe("toDurationSeconds", () => {
  it("returns numeric duration directly", () => {
    expect(toDurationSeconds({ duration: 120 })).toBe(120);
  });

  it("parses mm:ss string", () => {
    expect(toDurationSeconds({ duration: "2:30" })).toBe(150);
  });

  it("parses integer string", () => {
    expect(toDurationSeconds({ duration: "90" })).toBe(90);
  });

  it("parses seconds string with s suffix", () => {
    expect(toDurationSeconds({ duration: "45s" })).toBe(45);
  });

  it("falls back to shotlength fields", () => {
    expect(
      toDurationSeconds({ shotlength_minutes: 1, shotlength_seconds: 30 }),
    ).toBe(90);
  });

  it("returns 0 for empty input", () => {
    expect(toDurationSeconds({})).toBe(0);
  });
});

describe("countBy", () => {
  it("counts occurrences by field", () => {
    const items = [{ type: "A" }, { type: "B" }, { type: "A" }];
    expect(countBy(items, "type", "Unknown")).toEqual({ A: 2, B: 1 });
  });

  it("uses fallback for missing field", () => {
    const items = [{ type: "A" }, {}];
    expect(countBy(items, "type", "Missing")).toEqual({ A: 1, Missing: 1 });
  });
});

describe("getNodeContext", () => {
  it("returns shot stats for shot nodeType", async () => {
    mockRequestGraphql.mockResolvedValueOnce({
      shots_by_pk: {
        duration: 60,
        dialog: "hello",
        notes: null,
        sound_notes: null,
        image_url: null,
        storyboard_url: null,
        camera_angle: "low",
        framing: "wide",
        lens: "35mm",
        camera_movement: "static",
        created_at: "2024-01-01",
        updated_at: "2024-01-02",
      },
      shot_characters: [{ character_id: "c1" }],
    });

    const result = await getNodeContext("shot", "s1");
    expect(result.characters).toBe(1);
    expect(result.duration).toBe(60);
    expect(result.has_dialog).toBe(true);
    expect(result.has_notes).toBe(false);
    expect(result.camera_angle).toBe("low");
  });

  it("returns empty object for missing shot", async () => {
    mockRequestGraphql.mockResolvedValueOnce({
      shots_by_pk: null,
      shot_characters: [],
    });
    const result = await getNodeContext("shot", "s1");
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("returns node stats for non-shot nodeType (BUGFIX: data zugewiesen)", async () => {
    mockRequestGraphql.mockResolvedValueOnce({
      timeline_nodes_by_pk: {
        created_at: "2024-01-01",
        updated_at: "2024-01-02",
      },
      timeline_nodes: [{ level: 2 }, { level: 3 }, { level: 3 }],
      shots: [
        { duration: 60, shotlength_minutes: 1, shotlength_seconds: 0 },
        { duration: 30, shotlength_minutes: 0, shotlength_seconds: 30 },
      ],
      shot_characters: [{ character_id: "c1" }, { character_id: "c2" }],
    });

    const result = await getNodeContext("scene", "n1");
    expect(result.sequences).toBe(1);
    expect(result.scenes).toBe(3); // 2 level-3 + 1 for scene nodeType
    expect(result.shots).toBe(2);
    expect(result.characters).toBe(2);
    expect(result.total_duration).toBe(90);
    expect(result.average_duration).toBe(45);
    expect(result.created_at).toBe("2024-01-01");
  });
});

describe("getProjectStatsPayload", () => {
  it("aggregates 5 collections", async () => {
    mockRequestGraphql.mockResolvedValueOnce({
      projects_by_pk: { id: "p1", type: "film" },
      timeline_nodes: [{ level: 1 }],
      shots: [{ duration: 60 }],
      characters: [{ id: "c1" }],
      worlds: [{ id: "w1" }],
    });

    const result = await getProjectStatsPayload("p1");
    expect(result.project?.id).toBe("p1");
    expect(result.nodes).toHaveLength(1);
    expect(result.shots).toHaveLength(1);
    expect(result.characters).toHaveLength(1);
    expect(result.worlds).toHaveLength(1);
  });
});

describe("getShotCharacterCounts", () => {
  it("aggregates character appearances", async () => {
    mockRequestGraphql.mockResolvedValueOnce({
      shot_characters: [
        { character_id: "c1", character: { name: "Alice" } },
        { character_id: "c1", character: { name: "Alice" } },
        { character_id: "c2", character: { name: "Bob" } },
      ],
    });

    const result = await getShotCharacterCounts("p1");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      character_id: "c1",
      name: "Alice",
      shot_count: 2,
    });
    expect(result[1]).toEqual({
      character_id: "c2",
      name: "Bob",
      shot_count: 1,
    });
  });
});
