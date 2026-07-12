import { describe, it, expect } from "vitest";
import { buildExportManifest } from "../build-export-manifest";

describe("buildExportManifest", () => {
  it("builds schema v1 manifest", () => {
    const m = buildExportManifest({
      projectId: "p1",
      projectName: "Demo",
      source: "local",
    });
    expect(m.schemaVersion).toBe(1);
    expect(m.projectId).toBe("p1");
    expect(m.structurePath).toBe("structure.json");
    expect(m.assetsDir).toBe("assets");
  });
});
