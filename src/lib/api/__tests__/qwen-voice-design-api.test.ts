/**
 * Tests for Qwen VoiceDesign REST client.
 * Location: src/lib/api/__tests__/qwen-voice-design-api.test.ts
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/runtime/detect-runtime", () => ({
  isDesktopShell: vi.fn(() => true),
}));

vi.mock("@/lib/local/voice-design-sidecar-lifecycle", () => ({
  getVoiceDesignSidecarAuthToken: vi.fn(() => "test-token"),
}));

import { isDesktopShell } from "@/runtime/detect-runtime";
import { getVoiceDesignSidecarAuthToken } from "@/lib/local/voice-design-sidecar-lifecycle";
import {
  generateQwenVoiceDesignCandidates,
  getQwenVoiceDesignHealth,
  QwenVoiceDesignSidecarError,
  QwenVoiceDesignValidationError,
  validateQwenVoiceDesignGenerateRequest,
} from "../qwen-voice-design-api";

describe("qwen-voice-design-api", () => {
  beforeEach(() => {
    vi.mocked(isDesktopShell).mockReturnValue(true);
    vi.mocked(getVoiceDesignSidecarAuthToken).mockReturnValue("test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("rejects empty description", () => {
    expect(() =>
      validateQwenVoiceDesignGenerateRequest({
        description: "  ",
        previewText: "Hallo",
        language: "German",
      }),
    ).toThrow(QwenVoiceDesignValidationError);
  });

  it("rejects candidateCount above max", () => {
    expect(() =>
      validateQwenVoiceDesignGenerateRequest({
        description: "Male voice",
        previewText: "Hallo",
        language: "German",
        candidateCount: 5,
      }),
    ).toThrow(/Kandidatenanzahl/);
  });

  it("reads health without auth", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          model: "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
          ready: true,
          stub: true,
        }),
        { status: 200 },
      ),
    );
    const health = await getQwenVoiceDesignHealth();
    expect(health?.ready).toBe(true);
    expect(fetch).toHaveBeenCalledWith("http://127.0.0.1:3767/health");
  });

  it("posts generate request with bearer token", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          sessionId: "vd_sess_abc",
          candidates: [
            {
              id: "candidate-1",
              label: "A",
              audioUrl:
                "local://voice-design/sessions/vd_sess_abc/candidate-1.wav",
              description: "Male voice",
              durationMs: 4200,
              sampleRate: 24000,
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await generateQwenVoiceDesignCandidates({
      description: "Male voice",
      previewText: "Test preview",
      language: "German",
      candidateCount: 1,
    });

    expect(result.sessionId).toBe("vd_sess_abc");
    expect(result.candidates).toHaveLength(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://127.0.0.1:3767/voice-design/generate");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer test-token",
    );
  });

  it("throws sidecar error when fetch fails", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("ECONNREFUSED"));
    await expect(
      generateQwenVoiceDesignCandidates({
        description: "Male voice",
        previewText: "Test",
        language: "German",
      }),
    ).rejects.toThrow(QwenVoiceDesignSidecarError);
  });

  it("maps 400 response to validation error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ detail: "description must not be empty" }),
        {
          status: 400,
        },
      ),
    );
    await expect(
      generateQwenVoiceDesignCandidates({
        description: "Male voice",
        previewText: "Test",
        language: "German",
      }),
    ).rejects.toThrow(QwenVoiceDesignValidationError);
  });

  it("returns null health outside desktop shell", async () => {
    vi.mocked(isDesktopShell).mockReturnValue(false);
    await expect(getQwenVoiceDesignHealth()).resolves.toBeNull();
  });
});
