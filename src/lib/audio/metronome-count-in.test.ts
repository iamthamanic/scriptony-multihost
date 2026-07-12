/**
 * Unit tests for metronome count-in scheduling (T31).
 */

import { describe, expect, it } from "vitest";
import {
  beatIntervalMs,
  scheduleCountInClicks,
  totalCountInDurationMs,
} from "./metronome-count-in";
import { DEFAULT_METRONOME_CONFIG } from "./metronome-config";

describe("beatIntervalMs", () => {
  it("returns 500ms at 120 BPM", () => {
    expect(beatIntervalMs(120)).toBe(500);
  });

  it("returns 0 when BPM is 0", () => {
    expect(beatIntervalMs(0)).toBe(0);
  });
});

describe("scheduleCountInClicks", () => {
  it("schedules 3 clicks at 120 BPM", () => {
    expect(scheduleCountInClicks(DEFAULT_METRONOME_CONFIG)).toEqual([
      0, 500, 1000,
    ]);
  });

  it("uses single click when BPM is 0", () => {
    expect(
      scheduleCountInClicks({ ...DEFAULT_METRONOME_CONFIG, bpm: 0 }),
    ).toEqual([0]);
  });
});

describe("totalCountInDurationMs", () => {
  it("covers last click plus tail", () => {
    expect(totalCountInDurationMs(DEFAULT_METRONOME_CONFIG)).toBe(1080);
  });
});
