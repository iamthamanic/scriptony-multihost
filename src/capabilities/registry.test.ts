import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/cloud-session", () => ({
  canUseCloudSession: vi.fn(async () => false),
}));

vi.mock("@/lib/api-adapter/runtime-dispatch", () => ({
  canUseCloudFeatures: vi.fn(() => false),
  isLocalProfile: vi.fn(() => true),
}));

vi.mock("@/lib/api-adapter/domain-access", () => ({
  hasOpenLocalProject: vi.fn(() => false),
  DomainAccessError: class DomainAccessError extends Error {
    readonly code = "CLOUD_AUTH_REQUIRED" as const;
  },
}));

vi.mock("@/runtime/detect-runtime", () => ({
  isDesktopShell: vi.fn(() => true),
}));

import { canUseCloudSession } from "@/lib/auth/cloud-session";
import {
  canUseCloudFeatures,
  isLocalProfile,
} from "@/lib/api-adapter/runtime-dispatch";
import { hasOpenLocalProject } from "@/lib/api-adapter/domain-access";
import { isDesktopShell } from "@/runtime/detect-runtime";
import {
  CAPABILITY_REGISTRY,
  CapabilityDeniedError,
  getCapabilityKind,
  listDomainCrudCapabilities,
  requireCapability,
} from "./registry";

describe("capability registry", () => {
  it("all domain.crud entries use LOCAL_WHEN_PROJECT_OPEN", () => {
    const domain = listDomainCrudCapabilities();
    expect(domain.length).toBeGreaterThan(0);
    for (const entry of domain) {
      expect(getCapabilityKind(entry.id)).toBe("LOCAL_WHEN_PROJECT_OPEN");
    }
  });

  it("registry has unique ids", () => {
    const ids = CAPABILITY_REGISTRY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("stage is LOCAL_ONLY and gym uses CLOUD_SESSION", () => {
    expect(getCapabilityKind("feature.stage")).toBe("LOCAL_ONLY");
    expect(getCapabilityKind("feature.creative_gym")).toBe("CLOUD_SESSION");
  });
});

describe("requireCapability", () => {
  beforeEach(() => {
    vi.mocked(isLocalProfile).mockReturnValue(true);
    vi.mocked(isDesktopShell).mockReturnValue(true);
    vi.mocked(hasOpenLocalProject).mockReturnValue(false);
    vi.mocked(canUseCloudSession).mockResolvedValue(false);
    vi.mocked(canUseCloudFeatures).mockReturnValue(false);
  });

  it("allows LOCAL_ONLY without cloud session", async () => {
    await expect(requireCapability("feature.stage")).resolves.toBeUndefined();
  });

  it("denies domain CRUD without open local project on desktop", async () => {
    await expect(requireCapability("domain.crud.beats")).rejects.toBeInstanceOf(
      CapabilityDeniedError,
    );
  });

  it("allows domain CRUD when local project is open", async () => {
    vi.mocked(hasOpenLocalProject).mockReturnValue(true);
    await expect(
      requireCapability("domain.crud.beats"),
    ).resolves.toBeUndefined();
  });

  it("denies CLOUD_SESSION when not logged in", async () => {
    await expect(requireCapability("hybrid.tts")).rejects.toMatchObject({
      code: "CLOUD_AUTH_REQUIRED",
    });
  });

  it("allows CLOUD_SESSION when logged in", async () => {
    vi.mocked(canUseCloudSession).mockResolvedValue(true);
    await expect(requireCapability("hybrid.tts")).resolves.toBeUndefined();
  });
});
