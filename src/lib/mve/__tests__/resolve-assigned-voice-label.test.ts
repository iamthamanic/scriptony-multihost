/**
 * Tests for assigned voice display labels.
 * Location: src/lib/mve/__tests__/resolve-assigned-voice-label.test.ts
 */

import { describe, expect, it } from "vitest";
import type { VoiceEntry } from "@/lib/api/voice-entry";
import {
  ASSIGNED_VOICE_OTHER_PROVIDER_LABEL,
  resolveAssignedVoiceLabel,
  voiceEntriesForAssignedSelection,
} from "../resolve-assigned-voice-label";

const catalog: VoiceEntry[] = [
  {
    id: "vb-p1",
    name: "Test Stimme",
    lang: "de",
    gender: "profile",
  },
];

describe("resolveAssignedVoiceLabel", () => {
  it("uses catalog name when voice id matches", () => {
    expect(
      resolveAssignedVoiceLabel({ voiceId: "vb-p1", voices: catalog }),
    ).toBe("Test Stimme");
  });

  it("parses preset ids into engine label", () => {
    expect(
      resolveAssignedVoiceLabel({
        voiceId: "preset:kokoro:af_bella",
        voices: catalog,
      }),
    ).toBe("Kokoro — af_bella");
  });

  it("falls back when id is outside current provider catalog", () => {
    expect(
      resolveAssignedVoiceLabel({
        voiceId: "3b58d657-09a9-47cd-9fa0-1ac134c5e272",
        voices: catalog,
      }),
    ).toBe(ASSIGNED_VOICE_OTHER_PROVIDER_LABEL);
  });
});

describe("voiceEntriesForAssignedSelection", () => {
  it("appends synthetic entry for orphan assigned voice", () => {
    const entries = voiceEntriesForAssignedSelection(
      catalog,
      "preset:kokoro:af_bella",
      null,
    );
    expect(entries).toHaveLength(2);
    expect(entries[1]?.id).toBe("preset:kokoro:af_bella");
    expect(entries[1]?.name).toBe("Kokoro — af_bella");
    expect(entries[1]?.gender).toBe("zugewiesen");
  });

  it("returns catalog unchanged when assigned voice is listed", () => {
    expect(voiceEntriesForAssignedSelection(catalog, "vb-p1", null)).toEqual(
      catalog,
    );
  });
});
