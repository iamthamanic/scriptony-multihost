import { describe, expect, it } from "vitest";
import {
  getProjectDeleteConfirmationMode,
  projectDeleteRequiresCloudPassword,
} from "./project-delete-policy";

describe("project-delete-policy", () => {
  it("uses phrase for local projects without cloud sync", () => {
    expect(getProjectDeleteConfirmationMode({ cloudSyncEnabled: false })).toBe(
      "phrase",
    );
    expect(getProjectDeleteConfirmationMode({})).toBe("phrase");
    expect(projectDeleteRequiresCloudPassword(null)).toBe(false);
  });

  it("requires password when cloud sync is enabled", () => {
    expect(getProjectDeleteConfirmationMode({ cloudSyncEnabled: true })).toBe(
      "password",
    );
    expect(projectDeleteRequiresCloudPassword({ cloudSyncEnabled: true })).toBe(
      true,
    );
  });
});
