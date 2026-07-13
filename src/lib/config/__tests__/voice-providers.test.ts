/**
 * Tests for voice provider options.
 * Location: src/lib/config/__tests__/voice-providers.test.ts
 */

import { describe, expect, it } from "vitest";
import { VOICEBOX_PRESET_ENGINES } from "@/lib/config/voicebox-preset-engines";
import {
  listAvailableVoiceProviders,
  persistedEngineForProvider,
  resolveVoiceProviderId,
  VOICE_PROVIDER_OPTIONS,
} from "../voice-providers";

describe("voice-providers", () => {
  it("lists Eigene Stimmen, each preset engine (via Voicebox), and ElevenLabs", () => {
    const ids = VOICE_PROVIDER_OPTIONS.map((p) => p.id);
    expect(ids[0]).toBe("voicebox");
    expect(ids).toContain("kokoro");
    expect(ids).toContain("qwen_custom_voice");
    expect(ids.at(-1)).toBe("elevenlabs");
    expect(ids).toHaveLength(1 + VOICEBOX_PRESET_ENGINES.length + 1);
    expect(
      VOICE_PROVIDER_OPTIONS.find((p) => p.id === "voicebox")?.label,
    ).toContain("via Voicebox");
    expect(VOICE_PROVIDER_OPTIONS.find((p) => p.id === "kokoro")?.label).toBe(
      "Kokoro (via Voicebox)",
    );
    expect(listAvailableVoiceProviders()).toHaveLength(ids.length);
  });

  it("maps persisted engine kokoro to kokoro provider", () => {
    expect(resolveVoiceProviderId("kokoro")).toBe("kokoro");
    expect(persistedEngineForProvider("kokoro")).toBe("kokoro");
  });

  it("maps preset providers to voicebox engine on persist except kokoro", () => {
    expect(persistedEngineForProvider("qwen_custom_voice")).toBe("voicebox");
    expect(persistedEngineForProvider("voicebox")).toBe("voicebox");
  });
});
