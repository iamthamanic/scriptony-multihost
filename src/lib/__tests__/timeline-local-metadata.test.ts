import { describe, expect, it } from "vitest";
import { structureToTimelineNode } from "@/lib/api-adapter/timeline-local";
import type { StructureNode } from "@/backend/ScriptonyBackend";

describe("structureToTimelineNode metadata", () => {
  it("round-trips imageUrl from structure node metadata", () => {
    const node: StructureNode = {
      id: "scene-1",
      projectId: "proj-1",
      parentId: "seq-1",
      type: "scene",
      label: "Szene 1",
      orderIndex: 0,
      metadata: { imageUrl: "asset://scene-cover.webp" },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const timelineNode = structureToTimelineNode(node);

    expect(timelineNode.metadata?.imageUrl).toBe("asset://scene-cover.webp");
    expect(timelineNode.metadata?.node_type).toBe("scene");
  });
});
