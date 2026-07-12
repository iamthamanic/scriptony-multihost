/**
 * Tests for local project folder helpers.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  generateLocalProjectId,
  toFolderName,
  resolveUniqueProjectDir,
  ProjectFolderError,
} from "../project-folder";
import { createManifest, MANIFEST_FILENAME } from "../project-manifest";

const existsMock = vi.fn();
const readTextFileMock = vi.fn();

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: (...args: unknown[]) => existsMock(...args),
  readTextFile: (...args: unknown[]) => readTextFileMock(...args),
}));

describe("toFolderName", () => {
  it("sanitizes title and adds .scriptony extension", () => {
    expect(toFolderName("My Movie")).toBe("my_movie.scriptony");
  });

  it("handles umlauts", () => {
    expect(toFolderName("Müller")).toBe("mueller.scriptony");
  });

  it("falls back to untitled for empty input", () => {
    expect(toFolderName("   ")).toBe("untitled.scriptony");
  });
});

describe("generateLocalProjectId", () => {
  it("returns local_ prefixed uuid", () => {
    const id = generateLocalProjectId();
    expect(id).toMatch(/^local_[0-9a-f-]{36}$/i);
  });
});

describe("resolveUniqueProjectDir", () => {
  beforeEach(() => {
    existsMock.mockReset();
  });

  it("returns first free path when directory does not exist", async () => {
    existsMock.mockResolvedValue(false);
    const path = await resolveUniqueProjectDir("/tmp", "My Film");
    expect(path).toBe("/tmp/my_film.scriptony");
  });

  it("uses numeric suffix when directory exists without manifest", async () => {
    existsMock.mockImplementation(async (p: string) => {
      if (p === "/tmp/my_film.scriptony") return true;
      if (p === "/tmp/my_film.scriptony/scriptony.json") return false;
      return false;
    });
    const path = await resolveUniqueProjectDir("/tmp", "My Film");
    expect(path).toBe("/tmp/my_film_2.scriptony");
  });

  it("throws when valid project already exists", async () => {
    const existing = createManifest({
      projectId: "local_existing",
      title: "My Film",
    });
    existsMock.mockImplementation(async (p: string) => {
      if (p === "/tmp/my_film.scriptony") return true;
      if (p === `/tmp/my_film.scriptony/${MANIFEST_FILENAME}`) return true;
      return false;
    });
    readTextFileMock.mockResolvedValue(JSON.stringify(existing));
    await expect(resolveUniqueProjectDir("/tmp", "My Film")).rejects.toThrow(
      ProjectFolderError,
    );
  });
});
