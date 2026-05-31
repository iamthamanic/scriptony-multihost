import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/runtime/detect-runtime", () => ({
  isDesktopShell: vi.fn(() => true),
}));

vi.mock("@/lib/auth/getAuthToken", () => ({
  getAuthToken: vi.fn(async () => null),
}));

vi.mock("@/backend/backend-instance", () => ({
  getBackendInstance: vi.fn(() => null),
}));

vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return {
    ...actual,
    getBackendRuntimeProfile: vi.fn(
      () => null as "local" | "cloud" | "selfHosted" | null,
    ),
  };
});

import { getAuthToken } from "@/lib/auth/getAuthToken";
import { getBackendInstance } from "@/backend/backend-instance";
import { getBackendRuntimeProfile } from "@/lib/env";
import { isDesktopShell } from "@/runtime/detect-runtime";
import {
  DomainAccessError,
  hasOpenLocalProject,
  requireCloudAuthToken,
  resolveDomainAuthToken,
  usesCloudHttpForDomain,
} from "./domain-access";

describe("domain-access", () => {
  beforeEach(() => {
    vi.mocked(getBackendRuntimeProfile).mockReturnValue("local");
    vi.mocked(isDesktopShell).mockReturnValue(true);
    vi.mocked(getBackendInstance).mockReturnValue(null);
    vi.mocked(getAuthToken).mockResolvedValue(null);
  });

  it("hasOpenLocalProject is false without backend session", () => {
    expect(hasOpenLocalProject()).toBe(false);
    expect(usesCloudHttpForDomain()).toBe(true);
  });

  it("usesCloudHttpForDomain is false for desktop local with open project", () => {
    vi.mocked(getBackendInstance).mockReturnValue({
      localProject: { projectId: "proj-1" },
    } as never);
    expect(hasOpenLocalProject()).toBe(true);
    expect(usesCloudHttpForDomain()).toBe(false);
  });

  it("uses cloud path for local profile in browser without desktop shell", () => {
    vi.mocked(isDesktopShell).mockReturnValue(false);
    vi.mocked(getBackendInstance).mockReturnValue({
      localProject: { projectId: "proj-1" },
    } as never);
    expect(usesCloudHttpForDomain()).toBe(true);
  });

  it("uses cloud path for cloud profile", () => {
    vi.mocked(getBackendRuntimeProfile).mockReturnValue("cloud");
    expect(usesCloudHttpForDomain()).toBe(true);
  });

  it("resolveDomainAuthToken returns undefined for local domain path", async () => {
    vi.mocked(getBackendInstance).mockReturnValue({
      localProject: { projectId: "proj-1" },
    } as never);
    await expect(resolveDomainAuthToken()).resolves.toBeUndefined();
  });

  it("requireCloudAuthToken throws DomainAccessError without session", async () => {
    await expect(requireCloudAuthToken()).rejects.toBeInstanceOf(
      DomainAccessError,
    );
  });

  it("requireCloudAuthToken returns token when present", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("jwt-abc");
    await expect(requireCloudAuthToken()).resolves.toBe("jwt-abc");
  });
});
