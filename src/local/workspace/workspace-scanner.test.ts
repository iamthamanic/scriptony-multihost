import { describe, expect, it, vi } from "vitest";
import { listWorkspaceProjects, type WorkspaceFs } from "./workspace-scanner";

vi.mock("@tauri-apps/api/path", () => ({
  join: (...parts: string[]) => Promise.resolve(parts.join("/")),
}));

const manifestA = {
  format: "scriptony-project",
  version: 1,
  projectId: "local_a",
  title: "Alpha",
  storageMode: "local",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  sync: { enabled: false },
};

const manifestB = {
  ...manifestA,
  projectId: "local_b",
  title: "Beta",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

describe("listWorkspaceProjects", () => {
  it("returns valid projects sorted by updatedAt desc", async () => {
    const fs: WorkspaceFs = {
      readDir: async () => [
        { name: "alpha.scriptony", isDirectory: true },
        { name: "beta.scriptony", isDirectory: true },
        { name: "readme.txt", isDirectory: false },
      ],
      readTextFile: async (path) => {
        if (path.includes("alpha.scriptony")) {
          return JSON.stringify(manifestA);
        }
        if (path.includes("beta.scriptony")) {
          return JSON.stringify(manifestB);
        }
        throw new Error(`unexpected path ${path}`);
      },
    };

    const projects = await listWorkspaceProjects("/workspace", fs);
    expect(projects).toHaveLength(2);
    expect(projects[0]?.title).toBe("Beta");
    expect(projects[1]?.title).toBe("Alpha");
  });

  it("skips folders without valid manifest", async () => {
    const fs: WorkspaceFs = {
      readDir: async () => [{ name: "broken.scriptony", isDirectory: true }],
      readTextFile: async () => "{not-json",
    };
    const projects = await listWorkspaceProjects("/workspace", fs);
    expect(projects).toHaveLength(0);
  });
});
