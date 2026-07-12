/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detectRuntime, isDesktopShell } from "./detect-runtime";

vi.mock("../lib/env", () => ({
  getAppwritePublicConfig: () => ({
    endpoint: "https://appwrite.example.com/v1",
    projectId: "test-project",
  }),
}));

describe("isDesktopShell", () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    vi.unstubAllEnvs();
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
  });

  it("returns false when window is undefined", () => {
    // @ts-expect-error simulate SSR
    delete globalThis.window;
    expect(isDesktopShell()).toBe(false);
  });

  it("returns true when Tauri internals are present", () => {
    Object.defineProperty(globalThis, "window", {
      value: { __TAURI_INTERNALS__: {} },
      writable: true,
      configurable: true,
    });
    expect(isDesktopShell()).toBe(true);
  });

  it("returns false in a plain browser mock", () => {
    Object.defineProperty(globalThis, "window", {
      value: {},
      writable: true,
      configurable: true,
    });
    expect(isDesktopShell()).toBe(false);
  });
});

describe("detectRuntime", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      value: { location: { origin: "http://localhost:3000" } },
      writable: true,
      configurable: true,
    });
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to cloud in browser without env override", () => {
    const config = detectRuntime();
    expect(config.profile).toBe("cloud");
    expect(config.isDesktop).toBe(false);
    expect(config.isBrowser).toBe(true);
  });

  it("uses local profile in Tauri when VITE_SCRIPTONY_RUNTIME=local", () => {
    vi.stubEnv("VITE_SCRIPTONY_RUNTIME", "local");
    Object.defineProperty(globalThis, "window", {
      value: { __TAURI_INTERNALS__: {} },
      writable: true,
      configurable: true,
    });
    const config = detectRuntime();
    expect(config.profile).toBe("local");
    expect(config.isDesktop).toBe(true);
  });

  it("defaults to local profile inside Tauri shell (desktop-first)", () => {
    Object.defineProperty(globalThis, "window", {
      value: { __TAURI_INTERNALS__: {} },
      writable: true,
      configurable: true,
    });
    const config = detectRuntime();
    expect(config.profile).toBe("local");
    expect(config.isDesktop).toBe(true);
    expect(config.isBrowser).toBe(false);
  });

  it("uses cloud profile in Tauri when VITE_SCRIPTONY_RUNTIME=cloud", () => {
    vi.stubEnv("VITE_SCRIPTONY_RUNTIME", "cloud");
    Object.defineProperty(globalThis, "window", {
      value: { __TAURI_INTERNALS__: {} },
      writable: true,
      configurable: true,
    });
    const config = detectRuntime();
    expect(config.profile).toBe("cloud");
    expect(config.isDesktop).toBe(true);
  });
});
