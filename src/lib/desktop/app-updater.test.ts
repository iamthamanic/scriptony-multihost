import { describe, expect, it } from "vitest";
import { isAppUpdaterAvailable, readInstalledAppVersion } from "./app-updater";

describe("app-updater", () => {
  it("is unavailable outside the desktop shell", () => {
    expect(isAppUpdaterAvailable()).toBe(false);
  });

  it("readInstalledAppVersion returns null on web", async () => {
    await expect(readInstalledAppVersion()).resolves.toBeNull();
  });
});
