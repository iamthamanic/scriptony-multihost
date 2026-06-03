/**
 * Unit tests for cloud-session helpers (Axis 2).
 * Location: src/lib/auth/cloud-session.test.ts
 */

import { describe, it, expect, vi } from "vitest";
import {
  isRealCloudToken,
  getCloudAccessToken,
  createCloudRuntimeConfig,
} from "./cloud-session";
import { LOCAL_DEV_BEARER } from "./local-dev-token";

vi.mock("./createAuthFactory", () => ({
  createAuthFactory: vi.fn(() => ({
    getAccessToken: vi.fn(),
  })),
}));

vi.mock("../env", () => ({
  getMissingAppwriteConfig: vi.fn(() => []),
  getAppwritePublicConfig: vi.fn(() => ({
    endpoint: "https://appwrite.example.com/v1",
    projectId: "test-project",
  })),
}));

describe("isRealCloudToken", () => {
  it("returns false for null", () => {
    expect(isRealCloudToken(null)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isRealCloudToken("")).toBe(false);
  });

  it("returns false for LOCAL_DEV_BEARER", () => {
    expect(isRealCloudToken(LOCAL_DEV_BEARER)).toBe(false);
  });

  it("returns false for tokens with local_ prefix", () => {
    expect(isRealCloudToken("local_abc123")).toBe(false);
  });

  it("returns true for real JWT-like tokens", () => {
    expect(isRealCloudToken("eyJhbGciOiJIUzI1NiIs...")).toBe(true);
    expect(isRealCloudToken("valid_token_123")).toBe(true);
  });
});

describe("getCloudAccessToken", () => {
  it("returns null when getAccessToken throws", async () => {
    const { createAuthFactory } = await import("./createAuthFactory");
    const mockClient = {
      getAccessToken: vi.fn().mockRejectedValue(new Error("auth failed")),
    };
    vi.mocked(createAuthFactory).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createAuthFactory>,
    );

    const token = await getCloudAccessToken();
    expect(token).toBeNull();
  });

  it("filters out LOCAL_DEV_BEARER and returns null", async () => {
    const { createAuthFactory } = await import("./createAuthFactory");
    const mockClient = {
      getAccessToken: vi.fn().mockResolvedValue(LOCAL_DEV_BEARER),
    };
    vi.mocked(createAuthFactory).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createAuthFactory>,
    );

    const token = await getCloudAccessToken();
    expect(token).toBeNull();
  });

  it("returns real token when available", async () => {
    const { createAuthFactory } = await import("./createAuthFactory");
    const fakeToken = "mocked_access_token";
    const mockClient = { getAccessToken: vi.fn().mockResolvedValue(fakeToken) };
    vi.mocked(createAuthFactory).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createAuthFactory>,
    );

    const token = await getCloudAccessToken();
    expect(token).toBe(fakeToken);
  });
});

describe("createCloudRuntimeConfig", () => {
  it("forces profile to cloud while preserving other fields", () => {
    const base = {
      profile: "local",
      platform: "desktop",
    } as unknown as import("@/runtime/runtime-config").RuntimeConfig;
    const result = createCloudRuntimeConfig(base);
    expect(result.profile).toBe("cloud");
  });
});
