/**
 * Tests for Voicebox launch de-duplication guard.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearVoiceboxLaunchFailure,
  recordVoiceboxLaunchFailure,
  runVoiceboxLaunchOnce,
  voiceboxLaunchFailureMessage,
} from "../voicebox-launch-guard";

describe("voicebox-launch-guard", () => {
  afterEach(() => {
    clearVoiceboxLaunchFailure();
  });

  it("caches launch failure and skips repeated open attempts", async () => {
    recordVoiceboxLaunchFailure("Voicebox ist nicht installiert");

    const launch = vi.fn(async () => undefined);
    await expect(runVoiceboxLaunchOnce(launch)).rejects.toThrow(
      /nicht installiert/,
    );
    expect(launch).not.toHaveBeenCalled();
    expect(voiceboxLaunchFailureMessage()).toMatch(/nicht installiert/);
  });

  it("single-flights concurrent launch calls", async () => {
    let resolveGate: () => void = () => undefined;
    const gate = new Promise<void>((r) => {
      resolveGate = r;
    });
    const launch = vi.fn(async () => {
      await gate;
    });

    const first = runVoiceboxLaunchOnce(launch);
    const second = runVoiceboxLaunchOnce(launch);
    resolveGate();
    await Promise.all([first, second]);

    expect(launch).toHaveBeenCalledTimes(1);
  });
});
