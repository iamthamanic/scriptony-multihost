/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { mapCallbackUrlToWebUrl } from "./map-callback-url";

vi.mock("../env", () => ({
  backendConfig: {
    capacitor: {
      callbackHost: "auth-callback",
      urlScheme: "scriptony",
    },
  },
}));

describe("mapCallbackUrlToWebUrl", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, "location", {
      value: { origin: "http://localhost:3000" },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it("maps scriptony auth callback with query params to web origin", () => {
    const result = mapCallbackUrlToWebUrl(
      "scriptony://auth-callback?userId=abc&secret=xyz",
    );
    expect(result).toBe("http://localhost:3000?userId=abc&secret=xyz");
  });

  it("maps reset-password path on callback host", () => {
    const result = mapCallbackUrlToWebUrl(
      "scriptony://auth-callback/reset-password#token=1",
    );
    expect(result).toBe("http://localhost:3000/reset-password#token=1");
  });

  it("returns null for invalid URLs", () => {
    expect(mapCallbackUrlToWebUrl("not-a-url")).toBeNull();
  });

  it("rejects wrong scheme or callback host", () => {
    expect(
      mapCallbackUrlToWebUrl("https://evil.example/?userId=abc"),
    ).toBeNull();
    expect(
      mapCallbackUrlToWebUrl("scriptony://wrong-host?userId=abc"),
    ).toBeNull();
  });
});
