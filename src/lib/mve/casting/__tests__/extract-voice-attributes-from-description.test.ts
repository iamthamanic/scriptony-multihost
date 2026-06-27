/**
 * Tests for description → MveVoiceAttributes extraction.
 * Location: src/lib/mve/casting/__tests__/extract-voice-attributes-from-description.test.ts
 */

import { describe, expect, it } from "vitest";
import { extractVoiceAttributesFromDescription } from "../extract-voice-attributes-from-description";

describe("extractVoiceAttributesFromDescription", () => {
  it("extracts female + calm pace from German investigator description", () => {
    const attrs = extractVoiceAttributesFromDescription(
      "ruhige deutsche Ermittlerin, Mitte 30",
    );
    expect(attrs.genderPresentation).toBe("female");
    expect(attrs.ageImpression).toBe("middle_aged");
    expect(attrs.pace).toBe("slow");
  });

  it("extracts male + fast energy", () => {
    const attrs = extractVoiceAttributesFromDescription(
      "energischer junger Mann, schnell und laut",
    );
    expect(attrs.genderPresentation).toBe("male");
    expect(attrs.ageImpression).toBe("young_adult");
    expect(attrs.pace).toBe("fast");
    expect(attrs.energy).toBe("high");
  });

  it("extracts british accent hint", () => {
    const attrs = extractVoiceAttributesFromDescription(
      "british female narrator, warm and calm",
    );
    expect(attrs.genderPresentation).toBe("female");
    expect(attrs.accent).toBe("british");
    expect(attrs.texture).toBe("warm");
  });
});
