/**
 * Unit tests for editor-readmodel response builders.
 */

import { describe, expect, it } from "vitest";
import {
  buildLiteResponse,
  buildFullResponse,
} from "../services/editor-builders";

type JsonRecord = Record<string, unknown>;

describe("editor-builders", () => {
  const project: JsonRecord = {
    id: "p1",
    title: "Test",
    type: "film",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const nodes: JsonRecord[] = [
    { id: "a1", level: 1, title: "Act 1" },
    { id: "s1", level: 2, title: "Seq 1" },
    { id: "sc1", level: 3, title: "Scene 1" },
  ];

  it("buildLiteResponse returns project, timeline and meta", () => {
    const res = buildLiteResponse(project, nodes, 42);
    expect(res.project).toBeDefined();
    expect(res.timeline).toEqual({
      acts: [{ id: "a1", level: 1, title: "Act 1" }],
      sequences: [{ id: "s1", level: 2, title: "Seq 1" }],
      scenes: [{ id: "sc1", level: 3, title: "Scene 1" }],
    });
    expect((res.meta as JsonRecord).lite).toBe(true);
    expect((res.meta as JsonRecord).elapsedMs).toBe(42);
  });

  it("buildLiteResponse does not suggest lite=true when already in lite mode", () => {
    const manyNodes = Array.from({ length: 201 }, (_, i) => ({
      id: `n${i}`,
      level: 1,
    })) as JsonRecord[];
    const res = buildLiteResponse(project, manyNodes, 10);
    expect((res.meta as JsonRecord).warning).toBeUndefined();
  });

  it("buildFullResponse includes warning for large projects", () => {
    const manyNodes = Array.from({ length: 201 }, (_, i) => ({
      id: `n${i}`,
      level: 1,
    })) as JsonRecord[];
    const res = buildFullResponse(
      project,
      manyNodes,
      [],
      [],
      [],
      [],
      [],
      [],
      { style: null, items: [] },
      10,
    );
    expect((res.meta as JsonRecord).warning).toContain("Large project");
  });

  it("buildLiteResponse includes errors when provided", () => {
    const res = buildLiteResponse(project, nodes, 10, ["shots failed"]);
    expect(res.errors).toEqual(["shots failed"]);
  });

  it("buildFullResponse filters clips by existing shots", () => {
    const shots: JsonRecord[] = [{ id: "sh1", sceneId: "sc1" }];
    const clips: JsonRecord[] = [
      { id: "c1", shotId: "sh1" },
      { id: "c2", shotId: "sh2" },
    ];
    const res = buildFullResponse(
      project,
      nodes,
      [],
      shots,
      clips,
      [],
      [],
      [],
      { style: null, items: [] },
      10,
    );
    expect((res.clips as JsonRecord[]).length).toBe(1);
    expect((res.clips as JsonRecord[])[0].id).toBe("c1");
    expect((res.stats as JsonRecord).clips).toBe(1);
    expect((res.stats as JsonRecord).totalNodes).toBe(3);
  });

  it("buildFullResponse aggregates stats correctly", () => {
    const res = buildFullResponse(
      project,
      nodes,
      [{ id: "c1" }],
      [{ id: "sh1" }],
      [],
      [{ id: "sb1" }],
      [{ id: "sa1" }],
      [{ id: "a1" }],
      { style: null, items: [{ id: "si1" }] },
      10,
    );
    const stats = res.stats as JsonRecord;
    expect(stats.totalNodes).toBe(3);
    expect(stats.acts).toBe(1);
    expect(stats.sequences).toBe(1);
    expect(stats.scenes).toBe(1);
    expect(stats.characters).toBe(1);
    expect(stats.shots).toBe(1);
    expect(stats.scriptBlocks).toBe(1);
    expect(stats.sceneAudioTracks).toBe(1);
    expect(stats.assets).toBe(1);
    expect(stats.styleItems).toBe(1);
  });

  it("buildFullResponse includes errors array", () => {
    const res = buildFullResponse(
      project,
      nodes,
      [],
      [],
      [],
      [],
      [],
      [],
      { style: null, items: [] },
      10,
      ["domain failed"],
    );
    expect(res.errors).toEqual(["domain failed"]);
  });
});
