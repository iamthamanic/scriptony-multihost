import { describe, expect, it } from "vitest";
import {
  apiPayloadToLocalSettings,
  localSettingsToLegacyFields,
  parseLoglineFromPayload,
  parseProjectTypeFromPayload,
} from "../project-settings";

describe("project-settings", () => {
  it("parseProjectTypeFromPayload prefers type", () => {
    expect(parseProjectTypeFromPayload({ type: "book" })).toBe("book");
    expect(parseProjectTypeFromPayload({ projectType: "audio" })).toBe("audio");
    expect(parseProjectTypeFromPayload({})).toBe("film");
  });

  it("parseLoglineFromPayload prefers logline", () => {
    expect(parseLoglineFromPayload({ logline: "A" })).toBe("A");
    expect(parseLoglineFromPayload({ description: "B" })).toBe("B");
  });

  it("maps full update payload to settings and legacy fields", () => {
    const settings = apiPayloadToLocalSettings({
      logline: "Log",
      type: "series",
      genre: "Drama, Sci-Fi",
      duration: "01:30:00",
      linkedWorldId: "world-1",
      narrative_structure: "3-act",
      concept_blocks: [{ type: "hook", content: "x" }],
      inspirations: ["Insp"],
    });
    const legacy = localSettingsToLegacyFields(settings);
    expect(legacy.logline).toBe("Log");
    expect(legacy.genre).toBe("Drama, Sci-Fi");
    expect(legacy.narrative_structure).toBe("3-act");
    expect(legacy.linkedWorldId).toBe("world-1");
  });
});
