/**
 * Unit Tests für Ripple-Engine (calculateRipple).
 *
 * T30: Pure Functions, keine React-/API-Abhängigkeit.
 * 20+ Test-Cases für verschachtelte Szenen/Sequences/Acts.
 */

import { describe, it, expect } from "vitest";
import {
  calculateRipple,
  calculateSceneReorderRipple,
  checkForConflict,
} from "./ripple-engine";
import type { AudioClip } from "./types";

function makeClip(
  id: string,
  sceneId: string,
  startSec: number,
  endSec: number,
  overrides: Partial<AudioClip> = {},
): AudioClip {
  return {
    id,
    trackId: `track-${id}`,
    sceneId,
    projectId: "proj-1",
    startSec,
    endSec,
    laneIndex: 0,
    orderIndex: 0,
    trackType: "dialog",
    content: "Text",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    ...overrides,
  };
}
function makeScene(
  id: string,
  sequenceId: string,
  orderIndex: number,
  startSec: number,
  endSec: number,
) {
  return {
    id,
    sequenceId,
    startSec,
    endSec,
    durationSec: endSec - startSec,
    orderIndex,
  };
}
function makeSequence(
  id: string,
  actId: string,
  orderIndex: number,
  startSec: number,
  endSec: number,
) {
  return {
    id,
    actId,
    startSec,
    endSec,
    durationSec: endSec - startSec,
    orderIndex,
  };
}
function makeAct(
  id: string,
  orderIndex: number,
  startSec: number,
  endSec: number,
) {
  return { id, startSec, endSec, durationSec: endSec - startSec, orderIndex };
}

describe("calculateRipple", () => {
  it("delta = 0 → keine Änderungen", () => {
    const clip = makeClip("c1", "s1", 0, 10);
    const scene = makeScene("s1", "sq1", 0, 0, 10);
    const seq = makeSequence("sq1", "a1", 0, 0, 10);
    const act = makeAct("a1", 0, 0, 10);
    const result = calculateRipple({
      changedClipId: "c1",
      newEndSec: 10,
      allClips: [clip],
      allScenes: [scene],
      allSequences: [seq],
      allActs: [act],
    });
    expect(result.stats.deltaSec).toBe(0);
    expect(result.stats.affectedClips).toBe(0);
  });

  it("throwt wenn Clip nicht gefunden", () => {
    expect(() =>
      calculateRipple({
        changedClipId: "missing",
        newEndSec: 20,
        allClips: [],
        allScenes: [],
        allSequences: [],
        allActs: [],
      }),
    ).toThrow("Clip not found: missing");
  });

  it("throwt wenn Scene nicht gefunden", () => {
    const clip = makeClip("c1", "missing-scene", 0, 10);
    expect(() =>
      calculateRipple({
        changedClipId: "c1",
        newEndSec: 20,
        allClips: [clip],
        allScenes: [],
        allSequences: [],
        allActs: [],
      }),
    ).toThrow("Scene not found for clip: missing-scene");
  });

  it("Clip verlängert → Scene.endSec erhöht", () => {
    const clip = makeClip("c1", "s1", 0, 10);
    const scene = makeScene("s1", "sq1", 0, 0, 10);
    const seq = makeSequence("sq1", "a1", 0, 0, 10);
    const act = makeAct("a1", 0, 0, 10);
    const result = calculateRipple({
      changedClipId: "c1",
      newEndSec: 20,
      allClips: [clip],
      allScenes: [scene],
      allSequences: [seq],
      allActs: [act],
    });
    expect(result.updatedClips[0].endSec).toBe(20);
    expect(result.updatedScenes[0].endSec).toBe(20);
    expect(result.stats.deltaSec).toBe(10);
  });

  it("Clip verlängert → nachfolgende Scene in Sequence verschoben", () => {
    const c1 = makeClip("c1", "s1", 0, 10);
    const c2 = makeClip("c2", "s2", 10, 20);
    const s1 = makeScene("s1", "sq1", 0, 0, 10);
    const s2 = makeScene("s2", "sq1", 1, 10, 20);
    const sq1 = makeSequence("sq1", "a1", 0, 0, 20);
    const a1 = makeAct("a1", 0, 0, 20);
    const result = calculateRipple({
      changedClipId: "c1",
      newEndSec: 25,
      allClips: [c1, c2],
      allScenes: [s1, s2],
      allSequences: [sq1],
      allActs: [a1],
    });
    expect(result.updatedClips.find((c) => c.id === "c1")!.endSec).toBe(25);
    expect(result.updatedScenes.find((s) => s.id === "s2")!.startSec).toBe(25);
    expect(result.updatedClips.find((c) => c.id === "c2")!.startSec).toBe(25);
  });

  it("Scene verlängert → nachfolgende Sequence in Act verschoben", () => {
    const c1 = makeClip("c1", "s1", 0, 10);
    const c2 = makeClip("c2", "s3", 20, 30);
    const s1 = makeScene("s1", "sq1", 0, 0, 10);
    const s2 = makeScene("s2", "sq1", 1, 10, 20);
    const s3 = makeScene("s3", "sq2", 0, 20, 30);
    const sq1 = makeSequence("sq1", "a1", 0, 0, 20);
    const sq2 = makeSequence("sq2", "a1", 1, 20, 30);
    const a1 = makeAct("a1", 0, 0, 30);
    const result = calculateRipple({
      changedClipId: "c1",
      newEndSec: 30,
      allClips: [c1, c2],
      allScenes: [s1, s2, s3],
      allSequences: [sq1, sq2],
      allActs: [a1],
    });
    expect(result.updatedScenes.find((s) => s.id === "s2")!.startSec).toBe(30);
    expect(
      result.updatedSequences.find((sq) => sq.id === "sq2")!.startSec,
    ).toBe(40);
    expect(result.updatedClips.find((c) => c.id === "c2")!.startSec).toBe(40);
  });

  it("Sequence verlängert → nachfolgender Act verschoben", () => {
    const c1 = makeClip("c1", "s1", 0, 10);
    const c2 = makeClip("c2", "s4", 40, 50);
    const s1 = makeScene("s1", "sq1", 0, 0, 10);
    const s4 = makeScene("s4", "sq3", 0, 40, 50);
    const sq1 = makeSequence("sq1", "a1", 0, 0, 10);
    const sq3 = makeSequence("sq3", "a2", 0, 40, 50);
    const a1 = makeAct("a1", 0, 0, 10);
    const a2 = makeAct("a2", 1, 40, 50);
    const result = calculateRipple({
      changedClipId: "c1",
      newEndSec: 30,
      allClips: [c1, c2],
      allScenes: [s1, s4],
      allSequences: [sq1, sq3],
      allActs: [a1, a2],
    });
    expect(result.updatedActs.find((a) => a.id === "a2")!.startSec).toBe(60);
    expect(result.updatedClips.find((c) => c.id === "c2")!.startSec).toBe(60);
  });

  it("Clip kürzer → nachfolgende Scenes rutschen nach links", () => {
    const c1 = makeClip("c1", "s1", 0, 20);
    const c2 = makeClip("c2", "s2", 20, 30);
    const s1 = makeScene("s1", "sq1", 0, 0, 20);
    const s2 = makeScene("s2", "sq1", 1, 20, 30);
    const sq1 = makeSequence("sq1", "a1", 0, 0, 30);
    const a1 = makeAct("a1", 0, 0, 30);
    const result = calculateRipple({
      changedClipId: "c1",
      newEndSec: 10,
      allClips: [c1, c2],
      allScenes: [s1, s2],
      allSequences: [sq1],
      allActs: [a1],
    });
    expect(result.updatedClips.find((c) => c.id === "c1")!.endSec).toBe(10);
    expect(result.updatedScenes.find((s) => s.id === "s2")!.startSec).toBe(10);
    expect(result.updatedClips.find((c) => c.id === "c2")!.startSec).toBe(10);
  });

  it("negative Delta schützt gegen startSec < 0", () => {
    const c1 = makeClip("c1", "s1", 0, 5);
    const c2 = makeClip("c2", "s2", 5, 8);
    const s1 = makeScene("s1", "sq1", 0, 0, 5);
    const s2 = makeScene("s2", "sq1", 1, 5, 8);
    const sq1 = makeSequence("sq1", "a1", 0, 0, 8);
    const a1 = makeAct("a1", 0, 0, 8);
    const result = calculateRipple({
      changedClipId: "c1",
      newEndSec: 2,
      allClips: [c1, c2],
      allScenes: [s1, s2],
      allSequences: [sq1],
      allActs: [a1],
    });
    expect(
      result.updatedClips.find((c) => c.id === "c2")!.startSec,
    ).toBeGreaterThanOrEqual(0);
  });

  it("crossScene = true → Clip wird NICHT verschoben", () => {
    const c1 = makeClip("c1", "s1", 0, 10);
    const c2 = makeClip("c2", "s2", 10, 20, { crossScene: true });
    const s1 = makeScene("s1", "sq1", 0, 0, 10);
    const s2 = makeScene("s2", "sq1", 1, 10, 20);
    const sq1 = makeSequence("sq1", "a1", 0, 0, 20);
    const a1 = makeAct("a1", 0, 0, 20);
    const result = calculateRipple({
      changedClipId: "c1",
      newEndSec: 20,
      allClips: [c1, c2],
      allScenes: [s1, s2],
      allSequences: [sq1],
      allActs: [a1],
    });
    expect(result.updatedClips.find((c) => c.id === "c2")!.startSec).toBe(10);
  });

  it("Scene-Dauer = max(clip.endSec), nicht Summe", () => {
    const c1 = makeClip("c1", "s1", 0, 10);
    const c2 = makeClip("c2", "s1", 0, 30);
    const s1 = makeScene("s1", "sq1", 0, 0, 30);
    const sq1 = makeSequence("sq1", "a1", 0, 0, 30);
    const a1 = makeAct("a1", 0, 0, 30);
    const result = calculateRipple({
      changedClipId: "c1",
      newEndSec: 5,
      allClips: [c1, c2],
      allScenes: [s1],
      allSequences: [sq1],
      allActs: [a1],
    });
    expect(result.updatedScenes[0].endSec).toBe(30);
  });

  it("3 Szenen in Sequence → nur nachfolgende verschoben", () => {
    const c1 = makeClip("c1", "s1", 0, 10);
    const c2 = makeClip("c2", "s2", 10, 20);
    const c3 = makeClip("c3", "s3", 20, 30);
    const s1 = makeScene("s1", "sq1", 0, 0, 10);
    const s2 = makeScene("s2", "sq1", 1, 10, 20);
    const s3 = makeScene("s3", "sq1", 2, 20, 30);
    const sq1 = makeSequence("sq1", "a1", 0, 0, 30);
    const a1 = makeAct("a1", 0, 0, 30);
    const result = calculateRipple({
      changedClipId: "c2",
      newEndSec: 25,
      allClips: [c1, c2, c3],
      allScenes: [s1, s2, s3],
      allSequences: [sq1],
      allActs: [a1],
    });
    expect(result.updatedScenes.find((s) => s.id === "s1")!.startSec).toBe(0);
    expect(result.updatedScenes.find((s) => s.id === "s2")!.endSec).toBe(25);
    expect(result.updatedScenes.find((s) => s.id === "s3")!.startSec).toBe(25);
    expect(result.updatedClips.find((c) => c.id === "c3")!.startSec).toBe(25);
  });

  it("3 Sequences in Act → nur nachfolgende verschoben", () => {
    const c1 = makeClip("c1", "s1", 0, 10);
    const c2 = makeClip("c2", "s4", 30, 40);
    const s1 = makeScene("s1", "sq1", 0, 0, 10);
    const s4 = makeScene("s4", "sq3", 0, 30, 40);
    const sq1 = makeSequence("sq1", "a1", 0, 0, 10);
    const sq2 = makeSequence("sq2", "a1", 1, 10, 20);
    const sq3 = makeSequence("sq3", "a1", 2, 30, 40);
    const a1 = makeAct("a1", 0, 0, 40);
    const result = calculateRipple({
      changedClipId: "c1",
      newEndSec: 20,
      allClips: [c1, c2],
      allScenes: [s1, s4],
      allSequences: [sq1, sq2, sq3],
      allActs: [a1],
    });
    expect(result.updatedSequences.find((sq) => sq.id === "sq1")!.endSec).toBe(
      20,
    );
    expect(
      result.updatedSequences.find((sq) => sq.id === "sq2")!.startSec,
    ).toBe(20);
    expect(
      result.updatedSequences.find((sq) => sq.id === "sq3")!.startSec,
    ).toBe(40);
    expect(result.updatedClips.find((c) => c.id === "c2")!.startSec).toBe(40);
  });

  it("3 Acts → nur nachfolgende verschoben", () => {
    const c1 = makeClip("c1", "s1", 0, 10);
    const c2 = makeClip("c2", "s2", 50, 60);
    const s1 = makeScene("s1", "sq1", 0, 0, 10);
    const s2 = makeScene("s2", "sq4", 0, 50, 60);
    const sq1 = makeSequence("sq1", "a1", 0, 0, 10);
    const sq4 = makeSequence("sq4", "a3", 0, 50, 60);
    const a1 = makeAct("a1", 0, 0, 10);
    const a2 = makeAct("a2", 1, 10, 30);
    const a3 = makeAct("a3", 2, 50, 60);
    const result = calculateRipple({
      changedClipId: "c1",
      newEndSec: 25,
      allClips: [c1, c2],
      allScenes: [s1, s2],
      allSequences: [sq1, sq4],
      allActs: [a1, a2, a3],
    });
    expect(result.updatedActs.find((a) => a.id === "a1")!.endSec).toBe(25);
    expect(result.updatedActs.find((a) => a.id === "a2")!.startSec).toBe(25);
    expect(result.updatedActs.find((a) => a.id === "a3")!.startSec).toBe(65);
    expect(result.updatedClips.find((c) => c.id === "c2")!.startSec).toBe(65);
  });

  it("komplette Kaskade: Clip → Scene → Sequence → Act", () => {
    const clips = [
      makeClip("c1", "s1", 0, 10),
      makeClip("c2", "s2", 20, 30),
      makeClip("c3", "s3", 50, 60),
    ];
    const scenes = [
      makeScene("s1", "sq1", 0, 0, 10),
      makeScene("s2", "sq2", 0, 20, 30),
      makeScene("s3", "sq3", 0, 50, 60),
    ];
    const seqs = [
      makeSequence("sq1", "a1", 0, 0, 10),
      makeSequence("sq2", "a1", 1, 20, 30),
      makeSequence("sq3", "a2", 0, 50, 60),
    ];
    const acts = [makeAct("a1", 0, 0, 30), makeAct("a2", 1, 50, 60)];
    const result = calculateRipple({
      changedClipId: "c1",
      newEndSec: 30,
      allClips: clips,
      allScenes: scenes,
      allSequences: seqs,
      allActs: acts,
    });
    expect(result.stats.affectedClips).toBeGreaterThan(0);
    expect(result.stats.affectedScenes).toBeGreaterThan(0);
    expect(result.stats.affectedSequences).toBeGreaterThan(0);
    expect(result.stats.affectedActs).toBeGreaterThan(0);
    expect(result.stats.deltaSec).toBe(20);
    expect(result.updatedClips.find((c) => c.id === "c3")!.startSec).toBe(70);
  });

  it("Scene ohne sequenceId → Intra-Scene Ripple only", () => {
    const c1 = makeClip("c1", "s1", 0, 10);
    const c2 = makeClip("c2", "s1", 10, 20);
    const s1 = {
      id: "s1",
      sequenceId: null,
      startSec: 0,
      endSec: 20,
      durationSec: 20,
      orderIndex: 0,
    };
    const result = calculateRipple({
      changedClipId: "c1",
      newEndSec: 15,
      allClips: [c1, c2],
      allScenes: [s1],
      allSequences: [],
      allActs: [],
    });
    expect(result.updatedClips.find((c) => c.id === "c1")!.endSec).toBe(15);
    // Ohne Sequence gibt es keine Cross-Scene-Propagation → c2 bleibt unverändert
    expect(result.updatedClips.find((c) => c.id === "c2")!.startSec).toBe(10);
    expect(result.stats.affectedSequences).toBe(0);
    expect(result.stats.affectedActs).toBe(0);
  });

  it("mehrere Szenen mit null-sequenceId → keine Cross-Scene-Propagation", () => {
    const c1 = makeClip("c1", "s1", 0, 10);
    const c2 = makeClip("c2", "s2", 0, 10);
    const s1 = {
      id: "s1",
      sequenceId: null,
      startSec: 0,
      endSec: 10,
      durationSec: 10,
      orderIndex: 0,
    };
    const s2 = {
      id: "s2",
      sequenceId: null,
      startSec: 0,
      endSec: 10,
      durationSec: 10,
      orderIndex: 1,
    };
    const result = calculateRipple({
      changedClipId: "c1",
      newEndSec: 20,
      allClips: [c1, c2],
      allScenes: [s1, s2],
      allSequences: [],
      allActs: [],
    });
    // s1 wird länger, aber s2 darf NICHT verschoben werden (keine Sequence = keine Propagation)
    expect(result.updatedClips.find((c) => c.id === "c1")!.endSec).toBe(20);
    expect(result.updatedClips.find((c) => c.id === "c2")!.startSec).toBe(0);
    expect(result.updatedScenes.find((s) => s.id === "s2")!.startSec).toBe(0);
  });

  it("multiple Clips in derselben Scene → Ripple verschiebt alle", () => {
    const c1 = makeClip("c1", "s1", 0, 10);
    const c2 = makeClip("c2", "s1", 10, 20);
    const c3 = makeClip("c3", "s1", 20, 30);
    const s1 = makeScene("s1", "sq1", 0, 0, 30);
    const sq1 = makeSequence("sq1", "a1", 0, 0, 30);
    const a1 = makeAct("a1", 0, 0, 30);
    const result = calculateRipple({
      changedClipId: "c1",
      newEndSec: 20,
      allClips: [c1, c2, c3],
      allScenes: [s1],
      allSequences: [sq1],
      allActs: [a1],
    });
    // c1 wird länger, aber c2/c3 bleiben in derselben Scene → werden NICHT verschoben
    // (Ripple propagiert nur über Scenes, nicht innerhalb einer Scene)
    expect(result.updatedClips.find((c) => c.id === "c1")!.endSec).toBe(20);
    expect(result.updatedClips.find((c) => c.id === "c2")!.startSec).toBe(10);
    expect(result.updatedClips.find((c) => c.id === "c3")!.startSec).toBe(20);
    expect(result.updatedScenes[0].endSec).toBe(30); // max bleibt c3.endSec
  });

  it("kleines positives Delta bleibt konsistent (ein Clip pro Scene)", () => {
    const c1 = makeClip("c1", "s1", 0, 10);
    const s1 = makeScene("s1", "sq1", 0, 0, 10);
    const sq1 = makeSequence("sq1", "a1", 0, 0, 10);
    const a1 = makeAct("a1", 0, 0, 10);
    const r = calculateRipple({
      changedClipId: "c1",
      newEndSec: 10.5,
      allClips: [c1],
      allScenes: [s1],
      allSequences: [sq1],
      allActs: [a1],
    });
    expect(r.updatedClips.find((c) => c.id === "c1")!.endSec).toBe(10.5);
    expect(r.stats.deltaSec).toBe(0.5);
  });

  it("Clip-Verkürzung mit zwei Szenen in einer Sequence verschiebt nur Nachfolger", () => {
    const c1 = makeClip("c1", "s1", 0, 30);
    const c2 = makeClip("c2", "s2", 40, 50);
    const s1 = makeScene("s1", "sq1", 0, 0, 30);
    const s2 = makeScene("s2", "sq1", 1, 40, 50);
    const sq1 = makeSequence("sq1", "a1", 0, 0, 50);
    const a1 = makeAct("a1", 0, 0, 50);
    const r = calculateRipple({
      changedClipId: "c1",
      newEndSec: 20,
      allClips: [c1, c2],
      allScenes: [s1, s2],
      allSequences: [sq1],
      allActs: [a1],
    });
    expect(r.updatedClips.find((c) => c.id === "c2")!.startSec).toBe(30);
  });
});

describe("calculateSceneReorderRipple", () => {
  it("repacks two scenes after swap and shifts clips", () => {
    const c1 = makeClip("c1", "s1", 0, 10);
    const c2 = makeClip("c2", "s2", 20, 30);
    const s1 = makeScene("s1", "sq1", 0, 0, 10);
    const s2 = makeScene("s2", "sq1", 1, 20, 30);
    const sq1 = makeSequence("sq1", "a1", 0, 0, 30);
    const a1 = makeAct("a1", 0, 0, 30);
    const result = calculateSceneReorderRipple({
      orderedSceneIds: ["s2", "s1"],
      allClips: [c1, c2],
      allScenes: [s1, s2],
      allSequences: [sq1],
      allActs: [a1],
    });
    expect(result.updatedScenes.find((s) => s.id === "s2")!.startSec).toBe(0);
    expect(result.updatedScenes.find((s) => s.id === "s1")!.startSec).toBe(10);
    expect(result.updatedClips.find((c) => c.id === "c2")!.startSec).toBe(0);
    expect(result.updatedClips.find((c) => c.id === "c1")!.startSec).toBe(10);
  });

  it("updates order_index only when sequenceId is null", () => {
    const s1 = {
      id: "s1",
      sequenceId: null,
      startSec: 0,
      endSec: 10,
      durationSec: 10,
      orderIndex: 1,
    };
    const s2 = {
      id: "s2",
      sequenceId: null,
      startSec: 0,
      endSec: 10,
      durationSec: 10,
      orderIndex: 0,
    };
    const result = calculateSceneReorderRipple({
      orderedSceneIds: ["s1", "s2"],
      allClips: [],
      allScenes: [s1, s2],
      allSequences: [],
      allActs: [],
    });
    expect(result.updatedScenes.find((s) => s.id === "s1")!.orderIndex).toBe(0);
    expect(result.stats.deltaSec).toBe(0);
  });
});

describe("checkForConflict", () => {
  it("false wenn gleicher Zeitpunkt in unterschiedlicher ISO-Darstellung", () => {
    const clip = makeClip("c1", "s1", 0, 10, {
      updatedAt: "2024-06-01T12:00:00.000Z",
    });
    expect(
      checkForConflict({
        clipId: "c1",
        lastKnownUpdatedAt: "2024-06-01T14:00:00.000+02:00",
        allClips: [clip],
      }),
    ).toBe(false);
  });
  it("false wenn updatedAt gleich", () => {
    const clip = makeClip("c1", "s1", 0, 10, { updatedAt: "2024-01-01" });
    expect(
      checkForConflict({
        clipId: "c1",
        lastKnownUpdatedAt: "2024-01-01",
        allClips: [clip],
      }),
    ).toBe(false);
  });
  it("true wenn updatedAt unterschiedlich", () => {
    const clip = makeClip("c1", "s1", 0, 10, { updatedAt: "2024-01-02" });
    expect(
      checkForConflict({
        clipId: "c1",
        lastKnownUpdatedAt: "2024-01-01",
        allClips: [clip],
      }),
    ).toBe(true);
  });
  it("false wenn Clip gelöscht", () => {
    expect(
      checkForConflict({
        clipId: "missing",
        lastKnownUpdatedAt: "2024-01-01",
        allClips: [],
      }),
    ).toBe(false);
  });
});
