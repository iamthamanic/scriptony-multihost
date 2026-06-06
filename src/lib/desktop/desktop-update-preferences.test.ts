import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  isDesktopUpdateOnStartupEnabled,
  setDesktopUpdateOnStartupEnabled,
} from "./desktop-update-preferences";
import { STORAGE_KEYS } from "../config";

const storage = new Map<string, string>();

describe("desktop-update-preferences", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to enabled", () => {
    expect(isDesktopUpdateOnStartupEnabled()).toBe(true);
  });

  it("persists disabled state", () => {
    setDesktopUpdateOnStartupEnabled(false);
    expect(isDesktopUpdateOnStartupEnabled()).toBe(false);
    expect(storage.get(STORAGE_KEYS.DESKTOP_UPDATE_ON_STARTUP)).toBe("0");
    setDesktopUpdateOnStartupEnabled(true);
    expect(isDesktopUpdateOnStartupEnabled()).toBe(true);
  });
});
