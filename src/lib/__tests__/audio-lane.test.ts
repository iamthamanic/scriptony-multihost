/**
 * Tests für T32 DAW Features: audio-lane utilities.
 */

import { describe, it, expect } from "vitest";
import {
  assignLaneIndex,
  getLaneLabel,
  getLaneType,
  hasOverlap,
  volumeToDb,
  dbToVolume,
  formatVolumeDb,
  formatPanPercent,
  isLaneAudible,
  createDefaultLaneState,
  FX_PRESETS,
  getFxPreset,
  type LaneStates,
} from "../audio-lane";
import type { AudioClip } from "../types";

// ── assignLaneIndex ──────────────────────────────────────────────

describe("assignLaneIndex", () => {
  const makeClip = (
    overrides: Partial<AudioClip> & { id: string },
  ): AudioClip => ({
    trackId: "track-1",
    sceneId: "scene-1",
    projectId: "proj-1",
    startSec: 0,
    endSec: 10,
    laneIndex: 0,
    orderIndex: 0,
    trackType: "dialog",
    content: "Test",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  });

  it("assigns dialog clips to lane 0 by default", () => {
    const clip = makeClip({ id: "c1", trackType: "dialog" });
    const result = assignLaneIndex([], clip);
    expect(result).toBe(0);
  });

  it("assigns sfx clips to lane 10 by default", () => {
    const clip = makeClip({ id: "c1", trackType: "sfx" });
    const result = assignLaneIndex([], clip);
    expect(result).toBe(10);
  });

  it("assigns music clips to lane 20 by default", () => {
    const clip = makeClip({ id: "c1", trackType: "music" });
    const result = assignLaneIndex([], clip);
    expect(result).toBe(20);
  });

  it("assigns atmo clips to lane 30 by default", () => {
    const clip = makeClip({ id: "c1", trackType: "atmo" });
    const result = assignLaneIndex([], clip);
    expect(result).toBe(30);
  });

  it("avoids overlap: assigns next free lane when clips overlap in time", () => {
    const existing = [
      makeClip({
        id: "c1",
        trackType: "sfx",
        laneIndex: 10,
        startSec: 5,
        endSec: 15,
      }),
    ];
    const newClip = makeClip({
      id: "c2",
      trackType: "sfx",
      startSec: 5,
      endSec: 15,
    });
    const result = assignLaneIndex(existing, newClip);
    expect(result).toBe(11); // Next free SFX lane
  });

  it("allows same lane when clips don't overlap in time", () => {
    const existing = [
      makeClip({
        id: "c1",
        trackType: "sfx",
        laneIndex: 10,
        startSec: 0,
        endSec: 5,
      }),
    ];
    const newClip = makeClip({
      id: "c2",
      trackType: "sfx",
      startSec: 10,
      endSec: 20,
    });
    const result = assignLaneIndex(existing, newClip);
    expect(result).toBe(10); // Same lane, no overlap
  });

  it("falls back to max lane when all lanes overlap", () => {
    const existing: AudioClip[] = [];
    for (let i = 10; i <= 18; i++) {
      existing.push(
        makeClip({
          id: `c-${i}`,
          trackType: "sfx",
          laneIndex: i,
          startSec: 0,
          endSec: 100,
        }),
      );
    }
    const newClip = makeClip({
      id: "c-new",
      trackType: "sfx",
      startSec: 0,
      endSec: 100,
    });
    const result = assignLaneIndex(existing, newClip);
    expect(result).toBe(19); // Last SFX lane (max=19)
  });
});

// ── getLaneLabel ──────────────────────────────────────────────────

describe("getLaneLabel", () => {
  it("returns 'Dialog' for lane 0", () => {
    expect(getLaneLabel(0)).toBe("Dialog");
  });
  it("returns 'Dialog 2' for lane 1", () => {
    expect(getLaneLabel(1)).toBe("Dialog 2");
  });
  it("returns 'SFX' for lane 10", () => {
    expect(getLaneLabel(10)).toBe("SFX");
  });
  it("returns 'SFX 2' for lane 11", () => {
    expect(getLaneLabel(11)).toBe("SFX 2");
  });
  it("returns 'Musik' for lane 20", () => {
    expect(getLaneLabel(20)).toBe("Musik");
  });
  it("returns 'Atmo' for lane 30", () => {
    expect(getLaneLabel(30)).toBe("Atmo");
  });
  it("returns 'Erzähler' for lane 40", () => {
    expect(getLaneLabel(40)).toBe("Erzähler");
  });
  it("returns 'Global' for lane 90", () => {
    expect(getLaneLabel(90)).toBe("Global");
  });
  it("returns 'Lane 105' for lane above schema", () => {
    expect(getLaneLabel(105)).toBe("Lane 105");
  });
});

// ── getLaneType ──────────────────────────────────────────────────

describe("getLaneType", () => {
  it("returns 'dialog' for lane 0", () =>
    expect(getLaneType(0)).toBe("dialog"));
  it("returns 'sfx' for lane 10", () => expect(getLaneType(10)).toBe("sfx"));
  it("returns 'music' for lane 20", () =>
    expect(getLaneType(20)).toBe("music"));
  it("returns 'atmo' for lane 30", () => expect(getLaneType(30)).toBe("atmo"));
  it("returns 'narrator' for lane 40", () =>
    expect(getLaneType(40)).toBe("narrator"));
  it("returns 'global' for lane 90", () =>
    expect(getLaneType(90)).toBe("global"));
});

// ── volume / pan helpers ──────────────────────────────────────────

describe("volumeToDb", () => {
  it("converts 0 to -60 dB (muted)", () =>
    expect(volumeToDb(0)).toBeLessThan(-59));
  it("converts 1 to 0 dB", () => expect(volumeToDb(1)).toBeCloseTo(0));
  it("converts 1.2 to ~1.58 dB", () =>
    expect(volumeToDb(1.2)).toBeCloseTo(1.58, 1));
});

describe("dbToVolume", () => {
  it("converts -60 dB to 0", () => expect(dbToVolume(-60)).toBe(0));
  it("converts 0 dB to 1", () => expect(dbToVolume(0)).toBeCloseTo(1));
});

describe("formatVolumeDb", () => {
  it('formats muted as "-∞ dB"', () =>
    expect(formatVolumeDb(0)).toContain("∞"));
  it("formats 0 dB as '0.0 dB'", () =>
    expect(formatVolumeDb(1)).toContain("0.0 dB"));
  it("formats -6 dB", () => expect(formatVolumeDb(0.5)).toContain("dB"));
});

describe("formatPanPercent", () => {
  it("formats center as 'C'", () => expect(formatPanPercent(0)).toBe("C"));
  it("formats left pan", () => expect(formatPanPercent(-0.5)).toBe("L50%"));
  it("formats right pan", () => expect(formatPanPercent(0.7)).toBe("R70%"));
});

// ── isLaneAudible ──────────────────────────────────────────────────

describe("isLaneAudible", () => {
  it("returns true when no states exist", () => {
    expect(isLaneAudible(0, {})).toBe(true);
  });

  it("returns true when lane has default state", () => {
    expect(isLaneAudible(0, { 0: { ...createDefaultLaneState() } })).toBe(true);
  });

  it("returns false when lane is muted", () => {
    const state = { 0: { ...createDefaultLaneState(), mute: true } };
    expect(isLaneAudible(0, state)).toBe(false);
  });

  it("returns false when another lane has solo and this doesn't", () => {
    const states: LaneStates = {
      0: { ...createDefaultLaneState(), solo: true },
      1: { ...createDefaultLaneState() },
    };
    expect(isLaneAudible(1, states)).toBe(false);
  });

  it("returns true when lane has solo", () => {
    const states: LaneStates = {
      0: { ...createDefaultLaneState(), solo: true },
      1: { ...createDefaultLaneState() },
    };
    expect(isLaneAudible(0, states)).toBe(true);
  });

  it("returns false for lane without state when another lane is solo", () => {
    const states: LaneStates = {
      0: { ...createDefaultLaneState(), solo: true },
    };
    expect(isLaneAudible(2, states)).toBe(false);
  });
});

// ── FX Presets ──────────────────────────────────────────────────

describe("FX_PRESETS", () => {
  it("has 4 presets", () => {
    expect(FX_PRESETS).toHaveLength(4);
  });

  it("all presets have reverb type", () => {
    expect(FX_PRESETS.every((p) => p.type === "reverb")).toBe(true);
  });

  it("preset IDs are unique", () => {
    const ids = FX_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getFxPreset", () => {
  it("returns preset by id", () => {
    expect(getFxPreset("reverb_light")?.name).toBe("Leichter Hall");
  });

  it("returns undefined for unknown id", () => {
    expect(getFxPreset("unknown")).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(getFxPreset(undefined)).toBeUndefined();
  });
});

// ── hasOverlap ────────────────────────────────────────────────

describe("hasOverlap", () => {
  const makeClip = (
    overrides: Partial<AudioClip> & { id: string },
  ): AudioClip => ({
    trackId: "track-1",
    sceneId: "scene-1",
    projectId: "proj-1",
    startSec: 0,
    endSec: 10,
    laneIndex: 0,
    orderIndex: 0,
    trackType: "dialog",
    content: "Test",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  });

  it("returns false when no clips exist on the lane", () => {
    expect(hasOverlap([], { startSec: 5, endSec: 15 }, 10)).toBe(false);
  });

  it("returns false when clips on different lanes don't matter", () => {
    const clips = [
      makeClip({ id: "c1", laneIndex: 10, startSec: 0, endSec: 20 }),
    ];
    expect(hasOverlap(clips, { startSec: 5, endSec: 15 }, 11)).toBe(false);
  });

  it("returns true when clips overlap on the same lane", () => {
    const clips = [
      makeClip({ id: "c1", laneIndex: 10, startSec: 0, endSec: 20 }),
    ];
    expect(hasOverlap(clips, { startSec: 5, endSec: 15 }, 10)).toBe(true);
  });

  it("returns false when clips are adjacent (no gap but no overlap)", () => {
    const clips = [
      makeClip({ id: "c1", laneIndex: 10, startSec: 0, endSec: 10 }),
    ];
    expect(hasOverlap(clips, { startSec: 10, endSec: 20 }, 10)).toBe(false);
  });

  it("excludes the clip's own id from overlap check", () => {
    const clips = [
      makeClip({ id: "self", laneIndex: 10, startSec: 0, endSec: 20 }),
    ];
    expect(hasOverlap(clips, { startSec: 5, endSec: 15, id: "self" }, 10)).toBe(
      false,
    );
  });

  it("returns true for partial overlap", () => {
    const clips = [
      makeClip({ id: "c1", laneIndex: 10, startSec: 5, endSec: 15 }),
    ];
    expect(hasOverlap(clips, { startSec: 10, endSec: 20 }, 10)).toBe(true);
  });
});
