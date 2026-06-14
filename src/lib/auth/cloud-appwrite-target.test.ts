/**
 * Unit tests for cloud-appwrite-target (Axis 2).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setCloudSessionAppwriteOverride } from "@/lib/env";

const storage = new Map<string, string>();
const CONNECTIONS_KEY = "scriptony_self_hosted_connections_v1";
const ACTIVE_KEY = "scriptony_self_hosted_active_id";

vi.mock("@/lib/appwrite/client", () => ({
  resetAppwriteClient: vi.fn(),
}));

vi.mock("@/lib/auth/getAuthClient", () => ({
  resetAuthClient: vi.fn(),
}));

import { resetAppwriteClient } from "@/lib/appwrite/client";
import { resetAuthClient } from "@/lib/auth/getAuthClient";
import {
  getCloudAuthTarget,
  setCloudAuthTarget,
  getMissingManagedAppwriteConfig,
  resolveCloudAppwriteConfig,
  syncCloudAuthTargetToEnv,
  isInsecureAppwriteEndpoint,
  hasHybridFunctionsBaseUrl,
} from "./cloud-appwrite-target";

function seedActiveConnection() {
  const conn = {
    id: "sh_test",
    name: "Lab",
    endpoint: "https://lab.example/v1",
    projectId: "proj-lab",
    createdAt: "2026-01-01T00:00:00.000Z",
    lastUsedAt: null,
  };
  storage.set(CONNECTIONS_KEY, JSON.stringify([conn]));
  storage.set(ACTIVE_KEY, conn.id);
}

describe("cloud-appwrite-target", () => {
  beforeEach(() => {
    storage.clear();
    setCloudSessionAppwriteOverride(null);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => storage.get(k) ?? null,
        setItem: (k: string, v: string) => storage.set(k, v),
        removeItem: (k: string) => storage.delete(k),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("defaults to managed target", () => {
    expect(getCloudAuthTarget()).toBe("managed");
  });

  it("persists selfHosted target", () => {
    setCloudAuthTarget("selfHosted");
    expect(getCloudAuthTarget()).toBe("selfHosted");
  });

  it("reports missing managed config when env vars absent", () => {
    vi.stubEnv("VITE_APPWRITE_ENDPOINT", "");
    vi.stubEnv("VITE_APPWRITE_PROJECT_ID", "");
    expect(getMissingManagedAppwriteConfig().length).toBe(2);
  });

  it("resolveCloudAppwriteConfig uses active self-hosted connection", async () => {
    setCloudAuthTarget("selfHosted");
    seedActiveConnection();
    const cfg = await resolveCloudAppwriteConfig();
    expect(cfg).toEqual({
      endpoint: "https://lab.example/v1",
      projectId: "proj-lab",
    });
  });

  it("syncCloudAuthTargetToEnv sets cloud session override", async () => {
    vi.stubEnv("VITE_APPWRITE_ENDPOINT", "https://managed.example/v1");
    vi.stubEnv("VITE_APPWRITE_PROJECT_ID", "managed-proj");
    setCloudAuthTarget("managed");
    await syncCloudAuthTargetToEnv();
    expect(resetAppwriteClient).toHaveBeenCalled();
    expect(resetAuthClient).toHaveBeenCalled();
    const cfg = await resolveCloudAppwriteConfig();
    expect(cfg?.endpoint).toBe("https://managed.example/v1");
  });

  it("detects insecure http endpoints", () => {
    expect(isInsecureAppwriteEndpoint("http://localhost:8080/v1")).toBe(true);
    expect(isInsecureAppwriteEndpoint("https://safe.example/v1")).toBe(false);
  });

  it("hasHybridFunctionsBaseUrl reads env", () => {
    vi.stubEnv("VITE_APPWRITE_FUNCTIONS_BASE_URL", "https://fn.example");
    vi.stubEnv("VITE_BACKEND_API_BASE_URL", "");
    expect(hasHybridFunctionsBaseUrl()).toBe(true);
  });
});
