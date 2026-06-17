/**
 * Tests for hybrid style profile cloud push (T77).
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { StyleProfile } from "@/lib/types/style-profile";
import { createEmptyStyleProfileSpec } from "@/lib/style-profile/templates";

vi.mock("@/lib/auth/cloud-session", () => ({
  canUseCloudSessionAndConfig: vi.fn(async () => true),
}));

vi.mock("@/lib/api-adapter/runtime-dispatch", () => ({
  isLocalProfile: vi.fn(() => true),
}));

vi.mock("@/lib/api-adapter/domain-access", () => ({
  hasOpenLocalProject: vi.fn(() => true),
}));

vi.mock("@/lib/api/style-profile-cloud-http", () => ({
  cloudCreateStyleProfile: vi.fn(async () => ({
    id: "cloud-profile-1",
    projectId: "proj-1",
    name: "Test",
    type: "custom",
    status: "draft",
    version: 1,
    configSummary: {},
    spec: createEmptyStyleProfileSpec(),
    sync: { status: "synced", cloudId: "cloud-profile-1" },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  })),
  cloudUpdateStyleProfile: vi.fn(async () => ({
    id: "cloud-profile-1",
    projectId: "proj-1",
    name: "Test",
    type: "custom",
    status: "draft",
    version: 2,
    configSummary: {},
    spec: createEmptyStyleProfileSpec(),
    sync: { status: "synced", cloudId: "cloud-profile-1" },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  })),
  cloudDeleteStyleProfile: vi.fn(async () => undefined),
}));

import {
  cloudCreateStyleProfile,
  cloudUpdateStyleProfile,
} from "@/lib/api/style-profile-cloud-http";
import { upsertStyleProfileToCloud } from "@/lib/style-profile/hybrid-cloud-push";

function sampleProfile(overrides?: Partial<StyleProfile>): StyleProfile {
  return {
    id: "local-style-1",
    projectId: "proj-1",
    name: "Cutout",
    type: "animated_stylized",
    status: "draft",
    version: 1,
    configSummary: { styleSummary: "Flat" },
    spec: createEmptyStyleProfileSpec(),
    sync: { status: "local", cloudId: null, lastSyncedAt: null },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("hybrid-cloud-push", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates cloud profile when no cloudId exists", async () => {
    const meta = await upsertStyleProfileToCloud(sampleProfile());
    expect(cloudCreateStyleProfile).toHaveBeenCalledOnce();
    expect(cloudUpdateStyleProfile).not.toHaveBeenCalled();
    expect(meta).toMatchObject({
      status: "synced",
      cloudId: "cloud-profile-1",
    });
  });

  it("updates cloud profile when cloudId exists", async () => {
    const meta = await upsertStyleProfileToCloud(
      sampleProfile({
        sync: {
          status: "synced",
          cloudId: "cloud-profile-1",
          lastSyncedAt: "2026-01-01T00:00:00.000Z",
        },
      }),
    );
    expect(cloudUpdateStyleProfile).toHaveBeenCalledOnce();
    expect(cloudCreateStyleProfile).not.toHaveBeenCalled();
    expect(meta?.cloudId).toBe("cloud-profile-1");
  });
});
