import { describe, expect, it } from "vitest";
import { isAudioProjectType } from "../project-type-audio";

describe("isAudioProjectType", () => {
  it("accepts audio and hörspiel", () => {
    expect(isAudioProjectType("audio")).toBe(true);
    expect(isAudioProjectType("hörspiel")).toBe(true);
  });

  it("rejects film", () => {
    expect(isAudioProjectType("film")).toBe(false);
    expect(isAudioProjectType(undefined)).toBe(false);
  });
});
