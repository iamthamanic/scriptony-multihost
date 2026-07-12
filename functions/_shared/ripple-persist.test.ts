/**
 * Integration-style tests: calculateRipple → buildRipplePersistDelta (no DB).
 */

import { describe, it, expect } from "vitest";
import {
  calculateRipple,
  type RippleAct,
  type RippleClip,
  type RippleScene,
  type RippleSequence,
} from "./ripple-engine";
import { buildRipplePersistDelta } from "./ripple-persist";

function clip(
  id: string,
  sceneId: string,
  startSec: number,
  endSec: number,
): RippleClip {
  return { id, sceneId, startSec, endSec };
}

function scene(
  id: string,
  sequenceId: string | null,
  orderIndex: number,
  startSec: number,
  endSec: number,
): RippleScene {
  return {
    id,
    sequenceId,
    startSec,
    endSec,
    durationSec: Math.max(endSec - startSec, 0),
    orderIndex,
  };
}

function seq(
  id: string,
  actId: string | null,
  orderIndex: number,
  startSec: number,
  endSec: number,
): RippleSequence {
  return {
    id,
    actId,
    startSec,
    endSec,
    durationSec: Math.max(endSec - startSec, 0),
    orderIndex,
  };
}

function act(
  id: string,
  orderIndex: number,
  startSec: number,
  endSec: number,
): RippleAct {
  return {
    id,
    startSec,
    endSec,
    durationSec: Math.max(endSec - startSec, 0),
    orderIndex,
  };
}

describe("ripple persist pipeline", () => {
  it("buildRipplePersistDelta lists clip + timeline patches after ripple", () => {
    const mappedClips = [clip("c1", "s1", 0, 10), clip("c2", "s2", 20, 30)];
    const mappedScenes = [
      scene("s1", "sq1", 0, 0, 10),
      scene("s2", "sq1", 1, 20, 30),
    ];
    const mappedSeqs = [seq("sq1", "a1", 0, 0, 30)];
    const mappedActs = [act("a1", 0, 0, 30)];
    const result = calculateRipple({
      changedClipId: "c1",
      newEndSec: 20,
      allClips: mappedClips,
      allScenes: mappedScenes,
      allSequences: mappedSeqs,
      allActs: mappedActs,
    });
    const delta = buildRipplePersistDelta(
      mappedClips,
      mappedScenes,
      mappedSeqs,
      mappedActs,
      result,
    );
    expect(delta.clip_patches.length).toBeGreaterThan(0);
    expect(delta.clip_patches.find((p) => p.id === "c1")).toEqual({
      id: "c1",
      start_sec: 0,
      end_sec: 20,
    });
    expect(delta.timeline_node_patches.length).toBeGreaterThan(0);
  });
});
