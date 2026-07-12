/**
 * Tests for local voice preview playback guard.
 * Location: src/lib/mve/__tests__/play-voice-preview.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/runtime/detect-runtime", () => ({
  isDesktopShell: vi.fn(() => false),
}));

vi.mock("@/lib/api/local-tts-api", () => ({
  ensureKokoroSidecar: vi.fn(),
  synthesizeLocal: vi.fn(),
}));

import { isDesktopShell } from "@/runtime/detect-runtime";
import { playLocalVoicePreview } from "../play-voice-preview";

describe("playLocalVoicePreview", () => {
  beforeEach(() => {
    vi.mocked(isDesktopShell).mockReturnValue(false);
  });

  it("throws when not in desktop shell", async () => {
    await expect(
      playLocalVoicePreview({
        projectDir: "/tmp/proj",
        voiceId: "af_bella",
        text: "Hallo",
      }),
    ).rejects.toThrow(/Desktop-App/);
  });
});
