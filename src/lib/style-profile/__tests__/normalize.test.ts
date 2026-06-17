import { describe, expect, it } from "vitest";
import { normalizeStyleProfileFromParts } from "@/lib/style-profile/normalize";
import { createEmptyStyleProfileSpec } from "@/lib/style-profile/templates";

describe("normalizeStyleProfileFromParts", () => {
  it("parses JSON string spec from SQLite row", () => {
    const spec = createEmptyStyleProfileSpec();
    spec.visualSpec.styleDna.summary = "Test DNA";

    const profile = normalizeStyleProfileFromParts({
      id: "p1",
      projectId: "proj-1",
      name: "Main",
      spec: JSON.stringify(spec),
      configSummary: JSON.stringify({ styleSummary: "Legacy" }),
    });

    expect(profile.spec.visualSpec.styleDna.summary).toBe("Test DNA");
    expect(profile.name).toBe("Main");
    expect(profile.type).toBe("custom");
  });
});
