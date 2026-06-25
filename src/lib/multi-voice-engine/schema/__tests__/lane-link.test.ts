/**
 * Tests for MveLaneLink schema.
 * Location: src/lib/multi-voice-engine/schema/__tests__/lane-link.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  MveLaneLinkSchema,
  MveLaneLinkTargetContainerTypeSchema,
} from "../lane-link";

describe("MveLaneLink schema", () => {
  const base = {
    id: "mll_test_1",
    projectId: "proj_1",
    characterId: "char_1",
    targetContainerId: "scene_1",
    targetContainerType: "scene",
    enabled: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  it("accepts a valid scene link", () => {
    const parsed = MveLaneLinkSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.targetContainerType).toBe("scene");
      expect(parsed.data.enabled).toBe(true);
    }
  });

  it("accepts a valid shot link", () => {
    const parsed = MveLaneLinkSchema.safeParse({
      ...base,
      targetContainerType: "shot",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.targetContainerType).toBe("shot");
    }
  });

  it("rejects an invalid container type", () => {
    const parsed = MveLaneLinkSchema.safeParse({
      ...base,
      targetContainerType: "act",
    });
    expect(parsed.success).toBe(false);
  });

  it("defaults enabled to true", () => {
    const parsed = MveLaneLinkSchema.safeParse({
      ...base,
      enabled: undefined,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.enabled).toBe(true);
    }
  });

  it("target container type schema rejects unknown values", () => {
    const parsed = MveLaneLinkTargetContainerTypeSchema.safeParse("sequence");
    expect(parsed.success).toBe(false);
  });
});
