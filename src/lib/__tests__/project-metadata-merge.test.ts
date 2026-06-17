/**
 * Tests for project metadata_json merge helpers.
 */

import { describe, expect, it } from "vitest";
import {
  mergeActiveStyleProfileIntoMetadata,
  parseProjectMetadata,
} from "@/lib/project-metadata-merge";

describe("project-metadata-merge", () => {
  it("parses string metadata", () => {
    expect(
      parseProjectMetadata(
        JSON.stringify({ foo: "bar", activeStyleProfileId: "p1" }),
      ),
    ).toEqual({ foo: "bar", activeStyleProfileId: "p1" });
  });

  it("merges active style profile without dropping other keys", () => {
    const merged = mergeActiveStyleProfileIntoMetadata(
      JSON.stringify({ coverMode: "ai", active_style_profile_id: "old" }),
      "new-profile",
    );
    expect(JSON.parse(merged)).toEqual({
      coverMode: "ai",
      activeStyleProfileId: "new-profile",
    });
  });

  it("clears active profile when null", () => {
    const merged = mergeActiveStyleProfileIntoMetadata(
      JSON.stringify({ activeStyleProfileId: "x", keep: true }),
      null,
    );
    expect(JSON.parse(merged)).toEqual({ keep: true });
  });
});
