/**
 * Tests for Voicebox Qwen TTS warm-up.
 * Location: src/lib/voicebox/__tests__/voicebox-tts-warmup.test.ts
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/runtime/detect-runtime", () => ({
  isDesktopShell: vi.fn(() => true),
}));

vi.mock("@/lib/api/voicebox-api", () => ({
  ensureVoiceboxSidecar: vi.fn(async () => undefined),
  getVoiceboxHealth: vi.fn(),
  listVoiceboxProfiles: vi.fn(),
  generateVoiceboxSpeech: vi.fn(),
}));

import {
  ensureVoiceboxSidecar,
  generateVoiceboxSpeech,
  getVoiceboxHealth,
  listVoiceboxProfiles,
} from "@/lib/api/voicebox-api";
import { resetVoiceboxModelReadySignalForTests } from "../voicebox-model-ready-signal";
import {
  resetVoiceboxTtsWarmupForTests,
  VOICEBOX_QWEN_TTS_ENGINE,
  VOICEBOX_TTS_WARMUP_TEXT,
  warmUpVoiceboxQwenTts,
  warmUpVoiceboxQwenTtsDeduped,
} from "../voicebox-tts-warmup";

describe("voicebox-tts-warmup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetVoiceboxTtsWarmupForTests();
    resetVoiceboxModelReadySignalForTests();
    vi.mocked(getVoiceboxHealth).mockResolvedValue({
      status: "healthy",
      model_loaded: false,
      gpu_available: true,
    });
    vi.mocked(listVoiceboxProfiles).mockResolvedValue([
      { id: "p-warm", name: "Warm" },
    ]);
    vi.mocked(generateVoiceboxSpeech).mockResolvedValue({
      audioPath: "/proj/.scriptony/voicebox-output/warm.wav",
      durationMs: 400,
    });
  });

  afterEach(() => {
    resetVoiceboxTtsWarmupForTests();
    resetVoiceboxModelReadySignalForTests();
  });

  it("skips when model is already loaded", async () => {
    vi.mocked(getVoiceboxHealth).mockResolvedValue({
      status: "healthy",
      model_loaded: true,
      gpu_available: true,
    });

    const result = await warmUpVoiceboxQwenTts({ projectDir: "/proj" });

    expect(result).toEqual({
      warmed: true,
      skipped: true,
      reason: "already-warm",
    });
    expect(generateVoiceboxSpeech).not.toHaveBeenCalled();
  });

  it("runs minimal qwen generate when cold", async () => {
    const result = await warmUpVoiceboxQwenTts({
      projectDir: "/proj",
      profileId: "explicit",
    });

    expect(result).toEqual({ warmed: true, skipped: false });
    expect(ensureVoiceboxSidecar).toHaveBeenCalled();
    expect(generateVoiceboxSpeech).toHaveBeenCalledWith(
      expect.objectContaining({
        text: VOICEBOX_TTS_WARMUP_TEXT,
        profileId: "explicit",
        engine: VOICEBOX_QWEN_TTS_ENGINE,
        projectDir: "/proj",
      }),
    );
  });

  it("skips when no voicebox profile exists", async () => {
    vi.mocked(listVoiceboxProfiles).mockResolvedValue([]);

    const result = await warmUpVoiceboxQwenTts({ projectDir: "/proj" });

    expect(result.reason).toBe("no-profile");
    expect(generateVoiceboxSpeech).not.toHaveBeenCalled();
  });

  it("dedupes concurrent warm-up calls", async () => {
    const first = warmUpVoiceboxQwenTtsDeduped({ projectDir: "/proj" });
    const second = warmUpVoiceboxQwenTtsDeduped({ projectDir: "/proj" });

    await Promise.all([first, second]);

    expect(generateVoiceboxSpeech).toHaveBeenCalledTimes(1);
  });
});
