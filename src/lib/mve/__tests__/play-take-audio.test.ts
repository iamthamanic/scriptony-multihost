/**
 * playMveTakeAudio — rejects dummy placeholder URLs.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("@/runtime/detect-runtime", () => ({
  isDesktopShell: () => true,
}));

vi.mock("@/lib/local-audio-playback-url", () => ({
  resolveLocalAudioPlaybackUrl: vi.fn(),
}));

import { playMveTakeAudio } from "@/lib/mve/play-take-audio";

describe("playMveTakeAudio", () => {
  it("rejects dummy:// placeholder takes", async () => {
    await expect(playMveTakeAudio("dummy://take-0")).rejects.toThrow(/Dummy-Take/);
  });

  it("rejects empty audio path", async () => {
    await expect(playMveTakeAudio("  ")).rejects.toThrow(/keine Audio-Datei/);
  });
});
