/**
 * Tests for project sync orchestrator v1 scope.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/style-profile/style-profile-sync-engine", () => ({
  syncStyleProfilesBidirectional: vi.fn(async () => ({
    synced: 2,
    failed: 0,
    skipped: 0,
    pulled: 1,
    pushed: 1,
    conflicts: 0,
  })),
}));

vi.mock("@/lib/sync/project-meta-sync", () => ({
  syncProjectMeta: vi.fn(async () => ({
    synced: 0,
    failed: 0,
    skipped: 1,
  })),
}));

import { syncProjectBidirectional } from "@/lib/sync/project-sync-engine";

describe("project-sync-engine v1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks timeline and characters as skipped with reasons", async () => {
    const result = await syncProjectBidirectional("proj-1");
    expect(result.byDomain.characters.skipped).toBe(1);
    expect(result.byDomain.characters.skipReason).toContain(
      "Character-Sync v1",
    );
    expect(result.byDomain.timelineMeta.skipped).toBe(1);
    expect(result.byDomain.timelineMeta.skipReason).toContain(
      "Timeline-Style-Sync v1",
    );
    expect(result.byDomain.styleProfiles.synced).toBe(2);
  });
});
