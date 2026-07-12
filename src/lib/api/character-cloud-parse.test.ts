import { describe, expect, it } from "vitest";
import { parseCharacterFromApi } from "./character-cloud-parse";

describe("parseCharacterFromApi", () => {
  it("parses snake_case API fields", () => {
    const c = parseCharacterFromApi({
      id: "c1",
      project_id: "p1",
      name: "Ada",
      image_url: "https://example.com/a.png",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
    });
    expect(c.id).toBe("c1");
    expect(c.projectId).toBe("p1");
    expect(c.imageUrl).toBe("https://example.com/a.png");
  });

  it("throws when id or name missing", () => {
    expect(() => parseCharacterFromApi({ id: "x" })).toThrow(/required/);
  });
});
