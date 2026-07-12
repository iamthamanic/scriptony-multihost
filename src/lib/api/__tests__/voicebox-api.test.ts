/**
 * Tests for Voicebox REST client.
 * Location: src/lib/api/__tests__/voicebox-api.test.ts
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/runtime/detect-runtime", () => ({
  isDesktopShell: vi.fn(() => true),
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: vi.fn(async (...parts: string[]) => parts.join("/")),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  mkdir: vi.fn(async () => undefined),
  writeFile: vi.fn(async () => undefined),
}));

import { isDesktopShell } from "@/runtime/detect-runtime";
import {
  ensureVoiceboxAvailable,
  isVoiceboxHealthy,
  listVoiceboxProfiles,
  voiceboxProfilesAsVoiceEntries,
  generateVoiceboxSpeech,
} from "../voicebox-api";

function mockWavBytes(sampleRate = 22050, dataSize = 44100): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  view.setUint32(24, sampleRate, true);
  view.setUint32(40, dataSize, true);
  return buffer;
}

describe("voicebox-api", () => {
  beforeEach(() => {
    vi.mocked(isDesktopShell).mockReturnValue(true);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns false from isVoiceboxHealthy outside desktop shell", async () => {
    vi.mocked(isDesktopShell).mockReturnValue(false);
    await expect(isVoiceboxHealthy()).resolves.toBe(false);
  });

  it("lists profiles from array payload", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          { id: "p1", name: "Anna", language: "de" },
          { id: "bad", nope: true },
        ]),
        { status: 200 },
      ),
    );

    const profiles = await listVoiceboxProfiles();
    expect(profiles).toEqual([{ id: "p1", name: "Anna", language: "de" }]);
  });

  it("lists profiles from { profiles: [...] } payload", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          profiles: [{ id: "p2", name: "Ben", language: "en" }],
        }),
        { status: 200 },
      ),
    );

    const profiles = await listVoiceboxProfiles();
    expect(profiles).toEqual([{ id: "p2", name: "Ben", language: "en" }]);
  });

  it("maps profiles to VoiceEntry shape", () => {
    const entries = voiceboxProfilesAsVoiceEntries([
      { id: "p1", name: "Anna", language: "de" },
      { id: "p2", name: "Ben", language: null },
    ]);
    expect(entries).toEqual([
      { id: "p1", name: "Anna", lang: "de", gender: "profile" },
      { id: "p2", name: "Ben", lang: "de", gender: "profile" },
    ]);
  });

  it("throws from ensureVoiceboxAvailable when sidecar is down", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("ECONNREFUSED"));
    await expect(ensureVoiceboxAvailable()).rejects.toThrow(
      /Voicebox ist nicht erreichbar/,
    );
  });

  it("generates speech and saves wav to project dir", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(mockWavBytes(), { status: 200 }),
    );

    const result = await generateVoiceboxSpeech({
      text: "Hallo Welt",
      profileId: "p1",
      projectDir: "/tmp/proj",
    });

    expect(result.audioPath).toContain(
      "/tmp/proj/.scriptony/voicebox-output/vb-",
    );
    expect(result.durationMs).toBeGreaterThan(0);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/generate"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          text: "Hallo Welt",
          profile_id: "p1",
          language: "de",
        }),
      }),
    );
  });

  it("rejects generate without profile id", async () => {
    await expect(
      generateVoiceboxSpeech({
        text: "Hi",
        profileId: "  ",
        projectDir: "/tmp/proj",
      }),
    ).rejects.toThrow(/profile_id fehlt/);
  });
});
