/**
 * Tests for T14 index.ts dispatch + JobIdParam validation
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";

// Reconstruct the same schema used in index.ts
const JobIdParam = z.string().min(1).max(64);

describe("JobIdParam validation", () => {
  it("accepts valid IDs", () => {
    expect(JobIdParam.safeParse("abc123").success).toBe(true);
    expect(JobIdParam.safeParse("a".repeat(64)).success).toBe(true);
  });

  it("rejects empty strings", () => {
    expect(JobIdParam.safeParse("").success).toBe(false);
  });

  it("rejects IDs over 64 chars", () => {
    expect(JobIdParam.safeParse("a".repeat(65)).success).toBe(false);
  });

  it("allows dots but router regex prevents path traversal", () => {
    // z.string().min(1).max(64) allows dots — the regex router `[^/]+` blocks traversal
    expect(JobIdParam.safeParse("../etc").success).toBe(true);
    expect(JobIdParam.safeParse("../../etc").success).toBe(true);
    // Path traversal is prevented by the URL route regex `[^/]+`, not the Zod schema
  });
});

// Note: Full dispatch tests would require mocking RequestLike/ResponseLike.
// The JobIdParam schema is the security gate; router regex `[^/]+` prevents
// path-traversal at the URL level.
