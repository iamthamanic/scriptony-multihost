import { describe, it, expect } from "vitest";
import { buildRuntimeFromConnection } from "../build-runtime-from-connection";

describe("buildRuntimeFromConnection", () => {
  it("maps connection to selfHosted runtime", () => {
    const r = buildRuntimeFromConnection({
      id: "sh_1",
      name: "Studio",
      endpoint: "https://app.example.com/v1/",
      projectId: "abc",
      createdAt: "2026-01-01T00:00:00.000Z",
      lastUsedAt: null,
    });
    expect(r.profile).toBe("selfHosted");
    expect(r.appwriteEndpoint).toBe("https://app.example.com/v1");
    expect(r.appwriteProjectId).toBe("abc");
  });
});
