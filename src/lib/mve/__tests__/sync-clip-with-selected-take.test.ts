/**
 * syncClipWithSelectedTake — unit tests for local audio-clip sync from selected take.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-adapter/runtime-dispatch", () => ({
  isLocalProfile: () => true,
}));

vi.mock("@/lib/api-adapter/mve-adapter", () => ({
  getMveLine: vi.fn(),
}));

vi.mock("@/lib/api-adapter/mve-render-adapter", () => ({
  getMveTakesByLine: vi.fn(),
}));

vi.mock("@/backend/backend-instance", () => ({
  getBackendInstance: vi.fn(),
}));

vi.mock("@/lib/mve/decode-local-audio-to-peaks", () => ({
  decodeLocalAudioToPeaks: vi.fn(),
}));

import { getBackendInstance } from "@/backend/backend-instance";
import { getMveLine } from "@/lib/api-adapter/mve-adapter";
import { getMveTakesByLine } from "@/lib/api-adapter/mve-render-adapter";
import { decodeLocalAudioToPeaks } from "@/lib/mve/decode-local-audio-to-peaks";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { MveTake } from "@/lib/multi-voice-engine/schema/take";
import { syncClipWithSelectedTake } from "@/lib/mve/sync-clip-with-selected-take";

const mockClip = (startSec = 10) => ({
  id: "clip_1",
  startSec,
});

function makeAudioRepo(clip = mockClip()) {
  return {
    getClip: vi.fn().mockResolvedValue(clip),
    updateClip: vi.fn().mockResolvedValue({ ...clip, endSec: 11.2 }),
  };
}

describe("syncClipWithSelectedTake", () => {
  it("updates clip endSec and waveform from selected take", async () => {
    vi.mocked(getMveLine).mockResolvedValue({
      id: "line_1",
      audioClipId: "clip_1",
      selectedTakeId: "take_1",
    } as MveLine);
    vi.mocked(getMveTakesByLine).mockResolvedValue([
      {
        id: "take_1",
        status: "ready",
        audioUrl: "/takes/take.wav",
        durationMs: 1200,
        isSelected: true,
      } as MveTake,
    ]);
    vi.mocked(decodeLocalAudioToPeaks).mockResolvedValue({
      peaks: [0.1, 0.5, 0.9, 0.3],
      durationSec: 1.2,
    });
    const audioRepo = makeAudioRepo();
    vi.mocked(getBackendInstance).mockReturnValue({
      audio: audioRepo,
    } as unknown as ReturnType<typeof getBackendInstance>);

    const result = await syncClipWithSelectedTake("proj_1", "line_1");

    expect(result).toEqual({
      clipId: "clip_1",
      endSec: 11.2,
      durationMs: 1200,
    });
    expect(audioRepo.updateClip).toHaveBeenCalledWith("clip_1", {
      endSec: 11.2,
      waveformData: [0.1, 0.5, 0.9, 0.3],
    });
  });

  it("returns null when line has no selected take", async () => {
    vi.mocked(getMveLine).mockResolvedValue({
      id: "line_1",
      audioClipId: "clip_1",
      selectedTakeId: undefined,
    } as MveLine);

    const result = await syncClipWithSelectedTake("proj_1", "line_1");

    expect(result).toBeNull();
  });

  it("falls back to duration-only when WAV decode fails", async () => {
    vi.mocked(getMveLine).mockResolvedValue({
      id: "line_1",
      audioClipId: "clip_1",
      selectedTakeId: "take_1",
    } as MveLine);
    vi.mocked(getMveTakesByLine).mockResolvedValue([
      {
        id: "take_1",
        status: "ready",
        audioUrl: "/takes/take.wav",
        durationMs: 500,
        isSelected: true,
      } as MveTake,
    ]);
    vi.mocked(decodeLocalAudioToPeaks).mockRejectedValue(
      new Error("decode failed"),
    );
    const audioRepo = makeAudioRepo(mockClip(20));
    vi.mocked(getBackendInstance).mockReturnValue({
      audio: audioRepo,
    } as unknown as ReturnType<typeof getBackendInstance>);

    const result = await syncClipWithSelectedTake("proj_1", "line_1");

    expect(result).toEqual({ clipId: "clip_1", endSec: 20.5, durationMs: 500 });
    expect(audioRepo.updateClip).toHaveBeenCalledWith("clip_1", {
      endSec: 20.5,
    });
  });
});
