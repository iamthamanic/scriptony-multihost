import { describe, expect, it } from "vitest";
import { resolveSettingsTabVisibility } from "./settings-tab-visibility";

describe("resolveSettingsTabVisibility", () => {
  it("hides profile on desktop without cloud session", () => {
    const r = resolveSettingsTabVisibility({
      isLocalProfile: true,
      cloudSessionTracked: true,
      hasSession: false,
      user: { id: "local-user", email: "" },
      authLoading: false,
      authTarget: "managed",
      runtimeProfile: "local",
    });
    expect(r.showProfileTab).toBe(false);
    expect(r.showSubscriptionTab).toBe(false);
  });

  it("shows profile and abo on desktop managed cloud session", () => {
    const r = resolveSettingsTabVisibility({
      isLocalProfile: true,
      cloudSessionTracked: true,
      hasSession: true,
      user: { id: "local-user", email: "" },
      authLoading: false,
      authTarget: "managed",
      runtimeProfile: "local",
    });
    expect(r.showProfileTab).toBe(true);
    expect(r.showSubscriptionTab).toBe(true);
  });

  it("shows profile but not abo on desktop self-hosted session", () => {
    const r = resolveSettingsTabVisibility({
      isLocalProfile: true,
      cloudSessionTracked: true,
      hasSession: true,
      user: { id: "local-user", email: "" },
      authLoading: false,
      authTarget: "selfHosted",
      runtimeProfile: "local",
    });
    expect(r.showProfileTab).toBe(true);
    expect(r.showSubscriptionTab).toBe(false);
  });

  it("shows profile for browser Appwrite user on cloud runtime", () => {
    const r = resolveSettingsTabVisibility({
      isLocalProfile: false,
      cloudSessionTracked: false,
      hasSession: false,
      user: { id: "u1", email: "a@b.de" },
      authLoading: false,
      authTarget: "managed",
      runtimeProfile: "cloud",
    });
    expect(r.showProfileTab).toBe(true);
    expect(r.showSubscriptionTab).toBe(true);
  });

  it("hides abo on browser selfHosted runtime", () => {
    const r = resolveSettingsTabVisibility({
      isLocalProfile: false,
      cloudSessionTracked: false,
      hasSession: false,
      user: { id: "u1", email: "a@b.de" },
      authLoading: false,
      authTarget: "selfHosted",
      runtimeProfile: "selfHosted",
    });
    expect(r.showProfileTab).toBe(true);
    expect(r.showSubscriptionTab).toBe(false);
  });
});
