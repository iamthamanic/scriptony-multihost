import { describe, expect, it, vi } from "vitest";
import type { RuntimeConfig } from "../../runtime/runtime-config";
import {
  getOAuthRedirectTarget,
  getPasswordResetRedirectTarget,
} from "./auth-redirect";

vi.mock("../env", () => ({
  getAuthRedirectUrl: () => "http://localhost:3000",
  getPasswordResetRedirectUrl: () => "http://localhost:3000/reset-password",
  getCapacitorCallbackUrl: (path = "") =>
    path ? `scriptony://auth-callback/${path}` : "scriptony://auth-callback",
}));

const { isNativePlatformMock } = vi.hoisted(() => ({
  isNativePlatformMock: vi.fn(() => false),
}));

vi.mock("../capacitor/platform", () => ({
  isNativePlatform: () => isNativePlatformMock(),
}));

function cloudBrowser(): RuntimeConfig {
  return {
    profile: "cloud",
    isDesktop: false,
    isBrowser: true,
    isMobile: false,
  };
}

function tauriDesktop(): RuntimeConfig {
  return {
    profile: "cloud",
    isDesktop: true,
    isBrowser: false,
    isMobile: false,
  };
}

describe("auth-redirect", () => {
  it("uses web origin in browser cloud mode", () => {
    expect(getOAuthRedirectTarget(cloudBrowser())).toBe(
      "http://localhost:3000",
    );
    expect(getPasswordResetRedirectTarget(cloudBrowser())).toBe(
      "http://localhost:3000/reset-password",
    );
  });

  it("uses custom scheme on Tauri desktop", () => {
    expect(getOAuthRedirectTarget(tauriDesktop())).toBe(
      "scriptony://auth-callback",
    );
    expect(getPasswordResetRedirectTarget(tauriDesktop())).toBe(
      "scriptony://auth-callback/reset-password",
    );
  });

  it("uses custom scheme on Capacitor native", () => {
    isNativePlatformMock.mockReturnValue(true);
    expect(getOAuthRedirectTarget(cloudBrowser())).toBe(
      "scriptony://auth-callback",
    );
    isNativePlatformMock.mockReturnValue(false);
  });
});
