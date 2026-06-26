/**
 * Tests for MVE tag registry (T27).
 */

import { describe, it, expect } from "vitest";
import {
  MVE_TAGS,
  isMveTag,
  formatMveTag,
  parseMveTag,
  getMveTagPattern,
} from "../tags";

describe("MVE tags", () => {
  it("contains expected tags", () => {
    expect(MVE_TAGS).toContain("sad");
    expect(MVE_TAGS).toContain("happy");
    expect(MVE_TAGS).toContain("whisper");
  });

  it("formats a tag", () => {
    expect(formatMveTag("sad")).toBe("--sad");
  });

  it("parses valid tags", () => {
    expect(parseMveTag("--happy")).toBe("happy");
    expect(parseMveTag("loud")).toBe("loud");
  });

  it("rejects unknown tags", () => {
    expect(parseMveTag("--foo")).toBeNull();
    expect(isMveTag("foo")).toBe(false);
  });

  it("highlight pattern matches only known tags", () => {
    const text = "--sad and --foo --happy";
    const matches = text.match(getMveTagPattern());
    expect(matches).toEqual(["--sad", "--happy"]);
  });

  it("returns a fresh regex instance each time", () => {
    const a = getMveTagPattern();
    const b = getMveTagPattern();
    expect(a).not.toBe(b);
    a.exec("--sad");
    expect(a.lastIndex).not.toBe(0);
    expect(b.lastIndex).toBe(0);
  });
});
