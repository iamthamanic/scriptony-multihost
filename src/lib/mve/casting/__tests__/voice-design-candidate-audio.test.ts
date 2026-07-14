/**
 * Tests for voice design candidate preview audio fetch.
 * Location: src/lib/mve/casting/__tests__/voice-design-candidate-audio.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  getQwenVoiceDesignSidecarBaseUrl: () => "http://127.0.0.1:3767",
}));

vi.mock("@/lib/local/voice-design-sidecar-lifecycle", () => ({
  getVoiceDesignSidecarAuthToken: () => "test-token",
}));

import {
  fetchVoiceDesignCandidatePlaybackUrl,
  voiceDesignCandidateAudioHttpUrl,
} from "../voice-design-candidate-audio";

describe("voiceDesignCandidateAudioHttpUrl", () => {
  it("maps local sidecar URLs to HTTP", () => {
    expect(
      voiceDesignCandidateAudioHttpUrl(
        "local://voice-design/sessions/vd_sess_abc/candidate-1.wav",
      ),
    ).toBe(
      "http://127.0.0.1:3767/voice-design/sessions/vd_sess_abc/candidate-1.wav",
    );
  });
});

describe("fetchVoiceDesignCandidatePlaybackUrl", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(["wav"], { type: "audio/wav" })),
      }),
    );
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:playback"),
    });
  });

  it("fetches sidecar audio with auth and returns blob URL", async () => {
    const url = await fetchVoiceDesignCandidatePlaybackUrl(
      "local://voice-design/sessions/vd_sess_abc/candidate-1.wav",
    );
    expect(url).toBe("blob:playback");
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:3767/voice-design/sessions/vd_sess_abc/candidate-1.wav",
      expect.objectContaining({
        headers: { Authorization: "Bearer test-token" },
      }),
    );
  });
});
