/**
 * Unit tests for timeline.ts shared helpers.
 */

import { describe, expect, it } from "vitest";
import {
  buildTimeline,
  getProjectIdFromShot,
  stripContentFromNodes,
} from "../timeline";

type JsonRecord = Record<string, unknown>;

describe("buildTimeline", () => {
  it("filters nodes by level into acts/sequences/scenes", () => {
    const nodes: JsonRecord[] = [
      { id: "a1", level: 1, title: "Act 1" },
      { id: "s1", level: 2, title: "Seq 1" },
      { id: "sc1", level: 3, title: "Scene 1" },
      { id: "sh1", level: 4, title: "Shot 1" },
    ];
    const tl = buildTimeline(nodes);
    expect(tl.acts).toHaveLength(1);
    expect(tl.acts[0]).toEqual(nodes[0]);
    expect(tl.sequences).toHaveLength(1);
    expect(tl.sequences[0]).toEqual(nodes[1]);
    expect(tl.scenes).toHaveLength(1);
    expect(tl.scenes[0]).toEqual(nodes[2]);
  });

  it("skips nodes with non-numeric level", () => {
    const nodes: JsonRecord[] = [
      { id: "a1", level: 1, title: "Act 1" },
      { id: "x", level: "1", title: "Bad" },
      { id: "y", title: "No level" },
    ];
    const tl = buildTimeline(nodes);
    expect(tl.acts).toHaveLength(1);
  });
});

describe("stripContentFromNodes", () => {
  it("removes metadata.content and root content", () => {
    const nodes: JsonRecord[] = [
      {
        id: "n1",
        metadata: { content: "secret", other: "ok" },
        content: "root-secret",
      },
    ];
    const result = stripContentFromNodes(nodes);
    expect(result).toHaveLength(1);
    const r = result[0] as JsonRecord;
    expect((r.metadata as JsonRecord)?.content).toBeUndefined();
    expect(r.content).toBeUndefined();
    expect((r.metadata as JsonRecord)?.other).toBe("ok");
  });

  it("preserves nodes without content fields", () => {
    const nodes: JsonRecord[] = [{ id: "n2", title: "No content" }];
    const result = stripContentFromNodes(nodes);
    expect(result).toEqual(nodes);
  });

  it("skips null metadata", () => {
    const nodes: JsonRecord[] = [{ id: "n3", metadata: null, content: "root" }];
    const result = stripContentFromNodes(nodes);
    expect((result[0] as JsonRecord).content).toBeUndefined();
    expect((result[0] as JsonRecord).metadata).toBeNull();
  });
});

describe("getProjectIdFromShot", () => {
  it("returns project_id when present", () => {
    const shot: JsonRecord = { id: "s1", project_id: "p1" };
    expect(getProjectIdFromShot(shot)).toBe("p1");
  });

  it("returns null when project_id is missing", () => {
    expect(getProjectIdFromShot({ id: "s2" })).toBeNull();
  });

  it("returns null for null input", () => {
    expect(getProjectIdFromShot(null)).toBeNull();
  });

  it("returns null for non-string project_id", () => {
    expect(getProjectIdFromShot({ id: "s3", project_id: 123 })).toBeNull();
  });
});
