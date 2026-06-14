/**
 * VETILALORAPP test helpers — minimal film trees.
 */

import { expect } from "vitest";

import type {
  StructureTrimOperation,
  TimelineData,
  TimelineTree,
} from "../types";
import {
  DEFAULT_FRAME_RATE,
  DEFAULT_MIN_ITEM_DURATION_FRAMES,
  secToFrame,
} from "../types";
import { buildTimelineTree, treeToTimelineData } from "../buildTree";
import { resizeStructureItem } from "../../ripple-engine/hierarchical";

export function makeFilmTimelineData(): TimelineData {
  return {
    // Minimal film rows for tree tests (not full API entities).
    acts: [
      {
        id: "act-1",
        projectId: "p1",
        actNumber: 1,
        title: "Act 1",
        orderIndex: 0,
        metadata: { pct_from: 0, pct_to: 50 },
      },
      {
        id: "act-2",
        projectId: "p1",
        actNumber: 2,
        title: "Act 2",
        orderIndex: 1,
        metadata: { pct_from: 50, pct_to: 100 },
      },
    ],
    sequences: [
      {
        id: "seq-1",
        projectId: "p1",
        actId: "act-1",
        sequenceNumber: 1,
        title: "Seq 1",
        orderIndex: 0,
        metadata: { pct_from: 0, pct_to: 100 },
      },
      {
        id: "seq-2",
        projectId: "p1",
        actId: "act-2",
        sequenceNumber: 1,
        title: "Seq 2",
        orderIndex: 0,
        metadata: { pct_from: 0, pct_to: 100 },
      },
    ],
    scenes: [
      {
        id: "scene-1",
        projectId: "p1",
        sequenceId: "seq-1",
        sceneNumber: 1,
        title: "Scene 1",
        orderIndex: 0,
        metadata: { pct_from: 0, pct_to: 100 },
      },
      {
        id: "scene-2",
        projectId: "p1",
        sequenceId: "seq-2",
        sceneNumber: 1,
        title: "Scene 2",
        orderIndex: 0,
        metadata: { pct_from: 0, pct_to: 100 },
      },
    ],
    shots: [
      {
        id: "shot-1",
        projectId: "p1",
        sceneId: "scene-1",
        orderIndex: 0,
        shotNumber: "1",
        shotlengthSeconds: 10,
        shotlengthMinutes: 0,
        duration: "10s",
      },
      {
        id: "shot-2",
        projectId: "p1",
        sceneId: "scene-2",
        orderIndex: 0,
        shotNumber: "1",
        shotlengthSeconds: 10,
        shotlengthMinutes: 0,
        duration: "10s",
      },
    ],
  } as unknown as TimelineData;
}

export function buildTestTree(durationSec = 120): TimelineTree {
  return buildTimelineTree({
    timelineData: makeFilmTimelineData(),
    projectDurationSec: durationSec,
    frameRate: DEFAULT_FRAME_RATE,
  });
}

export function projectFrames(durationSec: number): number {
  return secToFrame(durationSec, DEFAULT_FRAME_RATE);
}

/** Spec Journey 12.1 — 2 acts, multi-seq/scene/shot hierarchy. */
export function makeJourney121TimelineData(): TimelineData {
  return {
    acts: [
      {
        id: "act-1",
        projectId: "p1",
        actNumber: 1,
        title: "Act 1",
        orderIndex: 0,
        metadata: { pct_from: 0, pct_to: 50 },
      },
      {
        id: "act-2",
        projectId: "p1",
        actNumber: 2,
        title: "Act 2",
        orderIndex: 1,
        metadata: { pct_from: 50, pct_to: 100 },
      },
    ],
    sequences: [
      {
        id: "seq-1",
        projectId: "p1",
        actId: "act-1",
        sequenceNumber: 1,
        title: "Seq 1",
        orderIndex: 0,
        metadata: { pct_from: 0, pct_to: 50 },
      },
      {
        id: "seq-2",
        projectId: "p1",
        actId: "act-1",
        sequenceNumber: 2,
        title: "Seq 2",
        orderIndex: 1,
        metadata: { pct_from: 50, pct_to: 100 },
      },
      {
        id: "seq-3",
        projectId: "p1",
        actId: "act-2",
        sequenceNumber: 1,
        title: "Seq 3",
        orderIndex: 0,
        metadata: { pct_from: 0, pct_to: 100 },
      },
    ],
    scenes: [
      {
        id: "scene-1",
        projectId: "p1",
        sequenceId: "seq-1",
        sceneNumber: 1,
        title: "Scene 1",
        orderIndex: 0,
        metadata: { pct_from: 0, pct_to: 40 },
      },
      {
        id: "scene-2",
        projectId: "p1",
        sequenceId: "seq-1",
        sceneNumber: 2,
        title: "Scene 2",
        orderIndex: 1,
        metadata: { pct_from: 40, pct_to: 100 },
      },
      {
        id: "scene-3",
        projectId: "p1",
        sequenceId: "seq-2",
        sceneNumber: 1,
        title: "Scene 3",
        orderIndex: 0,
        metadata: { pct_from: 0, pct_to: 100 },
      },
      {
        id: "scene-4",
        projectId: "p1",
        sequenceId: "seq-3",
        sceneNumber: 1,
        title: "Scene 4",
        orderIndex: 0,
        metadata: { pct_from: 0, pct_to: 100 },
      },
    ],
    shots: [
      {
        id: "shot-1",
        projectId: "p1",
        sceneId: "scene-1",
        orderIndex: 0,
        shotNumber: "1",
        shotlengthSeconds: 10,
        shotlengthMinutes: 0,
        duration: "10s",
      },
      {
        id: "shot-2",
        projectId: "p1",
        sceneId: "scene-1",
        orderIndex: 1,
        shotNumber: "2",
        shotlengthSeconds: 10,
        shotlengthMinutes: 0,
        duration: "10s",
      },
      {
        id: "shot-3",
        projectId: "p1",
        sceneId: "scene-2",
        orderIndex: 0,
        shotNumber: "1",
        shotlengthSeconds: 30,
        shotlengthMinutes: 0,
        duration: "30s",
      },
      {
        id: "shot-4",
        projectId: "p1",
        sceneId: "scene-3",
        orderIndex: 0,
        shotNumber: "1",
        shotlengthSeconds: 25,
        shotlengthMinutes: 0,
        duration: "25s",
      },
      {
        id: "shot-5",
        projectId: "p1",
        sceneId: "scene-3",
        orderIndex: 1,
        shotNumber: "2",
        shotlengthSeconds: 25,
        shotlengthMinutes: 0,
        duration: "25s",
      },
      {
        id: "shot-6",
        projectId: "p1",
        sceneId: "scene-4",
        orderIndex: 0,
        shotNumber: "1",
        shotlengthSeconds: 50,
        shotlengthMinutes: 0,
        duration: "50s",
      },
    ],
  } as unknown as TimelineData;
}

export function buildJourney121Tree(projectDurationSec = 200): TimelineTree {
  return buildTimelineTree({
    timelineData: makeJourney121TimelineData(),
    projectDurationSec,
    frameRate: DEFAULT_FRAME_RATE,
  });
}

export function expectSameFrames(
  treeA: TimelineTree,
  treeB: TimelineTree,
  ids: string[],
): void {
  for (const id of ids) {
    const a = treeA.items.get(id);
    const b = treeB.items.get(id);
    expect(a, `missing ${id} in treeA`).toBeDefined();
    expect(b, `missing ${id} in treeB`).toBeDefined();
    expect(b!.startFrame).toBe(a!.startFrame);
    expect(b!.endFrame).toBe(a!.endFrame);
  }
}

/** Persist-shaped roundtrip: tree → TimelineData → tree. */
export function roundtripViaTimelineData(
  tree: TimelineTree,
  base: TimelineData,
  projectDurationSec: number,
): TimelineTree {
  const effectiveSec = Math.max(
    projectDurationSec,
    tree.projectDurationFrames / DEFAULT_FRAME_RATE,
  );
  return buildTimelineTree({
    timelineData: treeToTimelineData(tree, base),
    projectDurationSec: effectiveSec,
    frameRate: DEFAULT_FRAME_RATE,
  });
}

export function trimStructureRight(
  tree: TimelineTree,
  itemId: string,
  deltaFrames: number,
  operation: StructureTrimOperation = "ripple-resize",
) {
  const item = tree.items.get(itemId);
  if (!item) throw new Error(`missing item ${itemId}`);
  return resizeStructureItem({
    tree,
    itemId,
    side: "right",
    operation,
    newBoundaryFrame: item.endFrame + deltaFrames,
    minItemDurationFrames: DEFAULT_MIN_ITEM_DURATION_FRAMES,
  });
}
