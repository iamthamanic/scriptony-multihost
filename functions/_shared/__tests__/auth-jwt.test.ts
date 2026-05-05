/**
 * Tests für _shared/auth-jwt Module (exportierte Funktionen)
 */

import { describe, expect, it } from "vitest";

const { getBearerToken, getUserFromAuthHeader } = await import("../auth-jwt");

describe("getBearerToken", () => {
  it("returns null for missing header", () => {
    expect(getBearerToken(undefined)).toBeNull();
  });

  it("returns null for non-Bearer header", () => {
    expect(getBearerToken("Basic xyz")).toBeNull();
  });

  it("extracts token from Bearer header", () => {
    expect(getBearerToken("Bearer abc123")).toBe("abc123");
  });
});

describe("getUserFromAuthHeader", () => {
  it("returns null when no token", async () => {
    const result = await getUserFromAuthHeader(undefined);
    expect(result).toBeNull();
  });
});
