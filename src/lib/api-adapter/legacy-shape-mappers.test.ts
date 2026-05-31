import { describe, expect, it } from "vitest";
import {
  localWorldIdForProject,
  projectIdFromLocalWorldId,
  toLegacyProject,
  workspaceEntryToLegacyProject,
} from "./legacy-shape-mappers";

describe("legacy-shape-mappers", () => {
  it("maps Project to legacy id/title", () => {
    const legacy = toLegacyProject({
      $id: "local_abc",
      name: "Mein Film",
      description: "Desc",
      projectType: "film",
      userId: "local-user",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    expect(legacy.id).toBe("local_abc");
    expect(legacy.title).toBe("Mein Film");
    expect(legacy.linkedWorldId).toBe("local-world-local_abc");
  });

  it("maps workspace entry", () => {
    const legacy = workspaceEntryToLegacyProject({
      projectId: "p1",
      title: "Alpha",
      dirPath: "/tmp/a.scriptony",
      updatedAt: "2026-05-01T00:00:00.000Z",
    });
    expect(legacy.id).toBe("p1");
    expect(legacy.title).toBe("Alpha");
    expect(legacy.localDirPath).toBe("/tmp/a.scriptony");
    expect(legacy.last_edited).toBe("2026-05-01T00:00:00.000Z");
  });

  it("roundtrips local world ids", () => {
    expect(localWorldIdForProject("x")).toBe("local-world-x");
    expect(projectIdFromLocalWorldId("local-world-x")).toBe("x");
    expect(projectIdFromLocalWorldId("other")).toBeNull();
  });
});
