/**
 * decodeLocalAudioToPeaks — guard errors without real WAV files.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("@/runtime/detect-runtime", () => ({
  isDesktopShell: () => true,
}));

vi.mock("@/lib/local-audio-playback-url", () => ({
  resolveLocalAudioPlaybackUrl: vi.fn(),
}));

import { resolveLocalAudioPlaybackUrl } from "@/lib/local-audio-playback-url";
import { decodeLocalAudioToPeaks } from "@/lib/mve/decode-local-audio-to-peaks";

describe("decodeLocalAudioToPeaks", () => {
  it("rejects empty path", async () => {
    await expect(decodeLocalAudioToPeaks("")).rejects.toThrow(
      /Audio-Pfad fehlt/,
    );
  });

  it("rejects unsupported audio protocol", async () => {
    vi.mocked(resolveLocalAudioPlaybackUrl).mockResolvedValue(
      "asset://take.wav",
    );
    await expect(decodeLocalAudioToPeaks("/fake/take.wav")).rejects.toThrow();
  });
});
