import { describe, expect, it } from "vitest";
import {
  PROJECT_INFO_CARD_CLASS,
  PROJECT_INFO_CARD_CONTENT_CLASS,
  PROJECT_INFO_CARD_HEIGHT_PX,
} from "../projects-page-utils";

describe("project info card layout", () => {
  it("keeps fixed height with internal scroll (no growing min/max shell)", () => {
    expect(PROJECT_INFO_CARD_HEIGHT_PX).toBe(360);
    expect(PROJECT_INFO_CARD_CLASS).toContain("h-[360px]");
    expect(PROJECT_INFO_CARD_CLASS).toContain("overflow-hidden");
    expect(PROJECT_INFO_CARD_CLASS).not.toMatch(/\bmin-h-/);
    expect(PROJECT_INFO_CARD_CLASS).not.toMatch(/\bmax-h-/);
    expect(PROJECT_INFO_CARD_CONTENT_CLASS).toContain("overflow-y-auto");
    expect(PROJECT_INFO_CARD_CONTENT_CLASS).toContain("min-h-0");
  });
});
