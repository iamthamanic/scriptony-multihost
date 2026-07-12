/**
 * Tests for Kokoro sidecar boot progress messages.
 * Location: src/lib/kokoro/__tests__/kokoro-loading-progress.test.ts
 */

import { describe, expect, it } from "vitest";
import { sidecarBootProgressForElapsed } from "../kokoro-loading-progress";

describe("sidecarBootProgressForElapsed", () => {
  it("returns early boot message under 5s", () => {
    const p = sidecarBootProgressForElapsed(2_000);
    expect(p.phase).toBe("boot");
    expect(p.percent).toBeLessThan(20);
    expect(p.message).toContain("Sidecar");
  });

  it("returns pip message after 12s", () => {
    const p = sidecarBootProgressForElapsed(13_000);
    expect(p.message).toContain("pip");
    expect(p.percent).toBeGreaterThanOrEqual(26);
  });

  it("returns connection message after 35s", () => {
    const p = sidecarBootProgressForElapsed(36_000);
    expect(p.message).toMatch(/Verbindung|Sidecar/);
    expect(p.percent).toBeGreaterThanOrEqual(46);
  });
});
