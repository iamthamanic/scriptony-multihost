import { describe, expect, it } from "vitest";
import { isCloudAppUser } from "./is-cloud-app-user";

describe("isCloudAppUser", () => {
  it("returns false for local desktop user", () => {
    expect(isCloudAppUser({ id: "local-user", email: "" })).toBe(false);
  });

  it("returns true for Appwrite user with email", () => {
    expect(isCloudAppUser({ id: "abc", email: "user@example.com" })).toBe(true);
  });

  it("returns false when email missing", () => {
    expect(isCloudAppUser({ id: "abc", email: "" })).toBe(false);
  });
});
