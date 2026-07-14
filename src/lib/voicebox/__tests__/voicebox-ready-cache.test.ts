/**
 * Tests for Voicebox session ready cache.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearVoiceboxSessionReady,
  isVoiceboxSessionReady,
  markVoiceboxSessionReady,
  voiceboxReadyCacheTtlMs,
} from "../voicebox-ready-cache";

describe("voicebox-ready-cache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearVoiceboxSessionReady();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks session ready within TTL", () => {
    markVoiceboxSessionReady();
    expect(isVoiceboxSessionReady()).toBe(true);
    vi.advanceTimersByTime(voiceboxReadyCacheTtlMs() - 1);
    expect(isVoiceboxSessionReady()).toBe(true);
  });

  it("expires after TTL", () => {
    markVoiceboxSessionReady();
    vi.advanceTimersByTime(voiceboxReadyCacheTtlMs() + 1);
    expect(isVoiceboxSessionReady()).toBe(false);
  });
});
