/**
 * Tests for Voicebox boot progress polling.
 * Location: src/lib/voicebox/__tests__/voicebox-loading-progress.test.ts
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/runtime/detect-runtime", () => ({
  isDesktopShell: vi.fn(() => true),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@/lib/api/voicebox-api", () => ({
  isVoiceboxHealthy: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import { isVoiceboxHealthy } from "@/lib/api/voicebox-api";
import {
  VOICEBOX_BOOT_TIMEOUT_MS,
  voiceboxBootProgressForElapsed,
  waitForVoiceboxReadyWithProgress,
} from "../voicebox-loading-progress";
import { clearVoiceboxLaunchFailure } from "../voicebox-launch-guard";
import { clearVoiceboxSessionReady } from "../voicebox-ready-cache";

describe("voicebox-loading-progress", () => {
  beforeEach(() => {
    clearVoiceboxLaunchFailure();
    clearVoiceboxSessionReady();
    vi.mocked(isVoiceboxHealthy).mockResolvedValue(false);
    vi.mocked(invoke).mockResolvedValue("launched");
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("returns ready progress when Voicebox is already healthy", async () => {
    vi.mocked(isVoiceboxHealthy).mockResolvedValue(true);
    const report = vi.fn();

    await waitForVoiceboxReadyWithProgress(report);

    expect(invoke).not.toHaveBeenCalled();
    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({ percent: 100, message: "TTS bereit" }),
    );
  });

  it("launches app and polls until healthy", async () => {
    vi.mocked(isVoiceboxHealthy)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const promise = waitForVoiceboxReadyWithProgress();
    await vi.advanceTimersByTimeAsync(1_500);
    await promise;

    expect(invoke).toHaveBeenCalledTimes(1);
    expect(vi.mocked(invoke).mock.calls[0]?.[0]).toBe("start_voicebox_app");
  });

  it("throws after boot timeout", async () => {
    vi.mocked(isVoiceboxHealthy).mockResolvedValue(false);

    const promise = waitForVoiceboxReadyWithProgress();
    const expectation = expect(promise).rejects.toThrow(
      /TTS-Dienst antwortet nicht/,
    );
    await vi.advanceTimersByTimeAsync(VOICEBOX_BOOT_TIMEOUT_MS + 1_000);
    await expectation;
  });

  it("maps elapsed boot time to progress phases", () => {
    expect(voiceboxBootProgressForElapsed(0).message).toMatch(/gestartet/);
    expect(voiceboxBootProgressForElapsed(25_000).percent).toBeGreaterThan(40);
  });
});
