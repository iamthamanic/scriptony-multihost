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

vi.mock("@/lib/voicebox/voicebox-loading-progress", () => ({
  waitForVoiceboxReadyWithProgress: vi.fn(async () => undefined),
}));

import { isDesktopShell } from "@/runtime/detect-runtime";
import { waitForVoiceboxReadyWithProgress } from "@/lib/voicebox/voicebox-loading-progress";
import {
  ensureVoiceboxAvailable,
  ensureVoiceboxSidecar,
  getVoiceboxHealth,
  isVoiceboxHealthy,
  listVoiceboxProfiles,
  voiceboxProfilesAsVoiceEntries,
  createVoiceboxProfile,
  generateVoiceboxSpeech,
  listVoiceboxProviderVoiceEntries,
  listKokoroPresetVoiceEntries,
  presetVoiceEntryId,
} from "../voicebox-api";

function mockWavBytes(sampleRate = 24000, dataSize = 44100): ArrayBuffer {
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

  it("reads health endpoint", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "healthy",
          model_loaded: true,
          gpu_available: true,
        }),
        { status: 200 },
      ),
    );
    const health = await getVoiceboxHealth();
    expect(health?.status).toBe("healthy");
    expect(health?.model_loaded).toBe(true);
  });

  it("lists profiles from array payload", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: "p1",
            name: "Anna",
            language: "de",
            default_engine: "qwen_custom_voice",
          },
          { id: "bad", nope: true },
        ]),
        { status: 200 },
      ),
    );

    const profiles = await listVoiceboxProfiles();
    expect(profiles).toEqual([
      {
        id: "p1",
        name: "Anna",
        language: "de",
        default_engine: "qwen_custom_voice",
      },
    ]);
  });

  it("maps profiles to VoiceEntry shape", () => {
    const entries = voiceboxProfilesAsVoiceEntries([
      { id: "p1", name: "Anna", language: "de" },
      { id: "p2", name: "Ben", language: null },
    ]);
    expect(entries).toEqual([
      {
        id: "p1",
        name: "Anna",
        lang: "de",
        gender: "profile",
        isPreset: false,
      },
      {
        id: "p2",
        name: "Ben",
        lang: "de",
        gender: "profile",
        isPreset: false,
      },
    ]);
  });

  it("generates speech via async JSON API and downloads audio", async () => {
    const generationId = "gen-1";
    const wav = mockWavBytes();

    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "p1",
              name: "Anna",
              default_engine: "qwen_custom_voice",
            },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: generationId,
            status: "generating",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: generationId,
            status: "completed",
            audio_path: "generations/gen-1.wav",
            duration: 1.2,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(wav, { status: 200 }));

    const result = await generateVoiceboxSpeech({
      text: "Hallo Welt",
      profileId: "p1",
      projectDir: "/tmp/proj",
    });

    expect(result.audioPath).toContain(
      "/tmp/proj/.scriptony/voicebox-output/vb-",
    );
    expect(result.durationMs).toBe(1200);
  });

  it("creates a profile via POST /profiles", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "new-p1",
          name: "Pazulu",
          language: "de",
        }),
        { status: 200 },
      ),
    );

    const profile = await createVoiceboxProfile({
      name: "Pazulu",
      description: "Scriptony — Pazulu",
      language: "de",
    });

    expect(profile).toEqual({
      id: "new-p1",
      name: "Pazulu",
      language: "de",
    });
  });

  it("delegates ensureVoiceboxAvailable to waitForVoiceboxReadyWithProgress", async () => {
    await ensureVoiceboxAvailable();
    expect(waitForVoiceboxReadyWithProgress).toHaveBeenCalled();
  });

  it("ensureVoiceboxSidecar forwards progress reporter", async () => {
    const report = vi.fn();
    await ensureVoiceboxSidecar(report);
    expect(waitForVoiceboxReadyWithProgress).toHaveBeenCalledWith(report);
  });

  it("lists Voicebox provider voices (profiles + non-Kokoro presets)", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ id: "p1", name: "Anna", language: "de" }]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            voices: [{ id: "q1", name: "Custom A" }],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ voices: [] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ voices: [] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ voices: [] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ voices: [] }), { status: 200 }),
      );

    const entries = await listVoiceboxProviderVoiceEntries();
    expect(entries).toEqual([
      {
        id: "p1",
        name: "Anna",
        lang: "de",
        gender: "profile",
        isPreset: false,
      },
      {
        id: presetVoiceEntryId("qwen_custom_voice", "q1"),
        name: "Qwen — Custom A",
        lang: "de",
        gender: "preset",
        presetEngine: "qwen_custom_voice",
        isPreset: true,
      },
    ]);
  });

  it("lists Kokoro provider presets only", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          voices: [{ voice_id: "af_bella", name: "Bella" }],
        }),
        { status: 200 },
      ),
    );

    const entries = await listKokoroPresetVoiceEntries();
    expect(entries).toEqual([
      {
        id: presetVoiceEntryId("kokoro", "af_bella"),
        name: "Kokoro — Bella",
        lang: "de",
        gender: "preset",
        presetEngine: "kokoro",
        isPreset: true,
      },
    ]);
  });
});
