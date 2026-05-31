import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/runtime/detect-runtime", () => ({
  detectRuntime: vi.fn(() => ({ profile: "cloud" as const })),
  isDesktopShell: vi.fn(() => true),
}));

vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return {
    ...actual,
    getBackendRuntimeProfile: vi.fn(
      () => null as "local" | "cloud" | "selfHosted" | null,
    ),
    getAppwritePublicConfig: vi.fn(() => ({
      endpoint: "https://cloud.example/v1",
      projectId: "proj",
    })),
  };
});

import { getBackendRuntimeProfile } from "@/lib/env";
import { detectRuntime, isDesktopShell } from "@/runtime/detect-runtime";
import {
  dispatchByRuntime,
  getRuntimeProfile,
  isLocalProfile,
} from "./runtime-dispatch";

describe("runtime-dispatch", () => {
  beforeEach(() => {
    vi.mocked(getBackendRuntimeProfile).mockReturnValue(null);
    vi.mocked(detectRuntime).mockReturnValue({
      profile: "cloud",
      isDesktop: false,
      isBrowser: true,
      isMobile: false,
    });
  });

  it("uses RuntimeProvider profile when set", () => {
    vi.mocked(getBackendRuntimeProfile).mockReturnValue("selfHosted");
    expect(getRuntimeProfile()).toBe("selfHosted");
    expect(isLocalProfile()).toBe(false);
  });

  it("uses cloud path for local profile in browser without desktop shell", async () => {
    vi.mocked(getBackendRuntimeProfile).mockReturnValue("local");
    vi.mocked(isDesktopShell).mockReturnValue(false);
    const result = await dispatchByRuntime(
      async () => "cloud",
      async () => "local",
    );
    expect(result).toBe("cloud");
  });

  it("falls back to detectRuntime before provider hydrate", () => {
    vi.mocked(detectRuntime).mockReturnValue({
      profile: "local",
      isDesktop: true,
      isBrowser: false,
      isMobile: false,
    });
    expect(getRuntimeProfile()).toBe("local");
    expect(isLocalProfile()).toBe(true);
  });
});
