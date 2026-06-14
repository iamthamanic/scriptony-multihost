import { describe, expect, it } from "vitest";
import {
  extractProjectAssetRelativePath,
  isAbsoluteFilesystemPath,
  isProjectAssetRelativePath,
  normalizeSceneImageStoragePath,
} from "@/lib/local-asset-display-url";

describe("local-asset-display-url", () => {
  it("detects project-relative asset paths", () => {
    expect(isProjectAssetRelativePath("assets/images/foo.webp")).toBe(true);
    expect(isProjectAssetRelativePath("/Users/me/proj/assets/foo.webp")).toBe(
      false,
    );
  });

  it("detects absolute filesystem paths", () => {
    expect(
      isAbsoluteFilesystemPath(
        "/Users/me/scriptony-local/w3a.scriptony/assets/images/foo.webp",
      ),
    ).toBe(true);
    expect(isAbsoluteFilesystemPath("assets/images/foo.webp")).toBe(false);
    expect(isAbsoluteFilesystemPath("https://cdn.example/a.png")).toBe(false);
    expect(
      isAbsoluteFilesystemPath("https://asset.localhost/path/to.webp"),
    ).toBe(false);
  });

  it("extracts assets/… from absolute project paths", () => {
    expect(
      extractProjectAssetRelativePath(
        "/Users/me/w3a.scriptony/assets/images/Event_Catering.webp",
      ),
    ).toBe("assets/images/Event_Catering.webp");
  });

  it("normalizes absolute paths to relative storage paths", () => {
    expect(
      normalizeSceneImageStoragePath(
        "/Users/me/w3a.scriptony/assets/images/Event_Catering.webp",
      ),
    ).toBe("assets/images/Event_Catering.webp");
    expect(normalizeSceneImageStoragePath("assets/images/a.webp")).toBe(
      "assets/images/a.webp",
    );
    expect(
      normalizeSceneImageStoragePath("https://cdn.example/a.png"),
    ).toBe("https://cdn.example/a.png");
  });
});
