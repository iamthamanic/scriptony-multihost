/**
 * VETILALORAPP — Journey 12.x trim → persist roundtrip (integration).
 * Location: src/lib/timeline-tree/__tests__/journey-roundtrip.test.ts
 */

import { describe, expect, it } from "vitest";
import { treeToTimelineData } from "../buildTree";
import { validateTimelineTree } from "../invariants";
import { projectStructureBlocksFromTree } from "../projectBlocks";
import {
  DEFAULT_FRAME_RATE,
  DEFAULT_MIN_ITEM_DURATION_FRAMES,
  secToFrame,
} from "../types";
import {
  buildJourney121Tree,
  expectSameFrames,
  makeJourney121TimelineData,
  roundtripViaTimelineData,
  trimStructureRight,
} from "./test-helpers";

const PROJECT_SEC = 200;
const JOURNEY_TD = makeJourney121TimelineData();
const MIN = DEFAULT_MIN_ITEM_DURATION_FRAMES;

describe("Journey 12.x roundtrip", () => {
  it("12.1 scene +10s propagates and survives persist rebuild", () => {
    const tree = buildJourney121Tree(PROJECT_SEC);
    const delta = secToFrame(10, DEFAULT_FRAME_RATE);
    const act2Before = tree.items.get("act-2")!.startFrame;

    const result = trimStructureRight(tree, "scene-1", delta);
    expect(result.blocked).toBe(false);

    const { next } = result;
    expect(next.items.get("scene-2")!.startFrame).toBe(
      tree.items.get("scene-2")!.startFrame + delta,
    );
    expect(next.items.get("seq-1")!.endFrame).toBe(
      tree.items.get("seq-1")!.endFrame + delta,
    );
    expect(next.items.get("act-2")!.startFrame).toBe(act2Before + delta);

    const rebuilt = roundtripViaTimelineData(next, JOURNEY_TD, PROJECT_SEC);
    expectSameFrames(next, rebuilt, [
      "scene-1",
      "scene-2",
      "seq-1",
      "seq-2",
      "act-1",
      "act-2",
      "shot-1",
      "shot-2",
      "shot-3",
    ]);
    expect(
      validateTimelineTree(rebuilt, { minItemDurationFrames: MIN }),
    ).toHaveLength(0);
  });

  it("12.2 scene shrink roundtrips to original layout", () => {
    const tree = buildJourney121Tree(PROJECT_SEC);
    const delta = secToFrame(10, DEFAULT_FRAME_RATE);
    const grow = trimStructureRight(tree, "scene-1", delta);
    const shrink = trimStructureRight(grow.next, "scene-1", -delta);
    expect(shrink.blocked).toBe(false);

    const rebuilt = roundtripViaTimelineData(
      shrink.next,
      JOURNEY_TD,
      PROJECT_SEC,
    );
    expectSameFrames(shrink.next, rebuilt, [
      "scene-1",
      "scene-2",
      "seq-1",
      "act-1",
      "act-2",
    ]);
  });

  it("12.3 shot grow propagates to act and roundtrips", () => {
    const tree = buildJourney121Tree(PROJECT_SEC);
    const delta = secToFrame(5, DEFAULT_FRAME_RATE);
    const result = trimStructureRight(tree, "shot-1", delta);
    expect(result.blocked).toBe(false);
    expect(result.next.items.get("act-1")!.endFrame).toBeGreaterThan(
      tree.items.get("act-1")!.endFrame,
    );

    const rebuilt = roundtripViaTimelineData(
      result.next,
      JOURNEY_TD,
      PROJECT_SEC,
    );
    expectSameFrames(result.next, rebuilt, [
      "shot-1",
      "shot-2",
      "scene-1",
      "seq-1",
      "act-1",
      "act-2",
    ]);
  });

  it("12.5 act shell grow ripples acts without moving seq children", () => {
    const tree = buildJourney121Tree(PROJECT_SEC);
    const delta = secToFrame(10, DEFAULT_FRAME_RATE);
    const seq1EndBefore = tree.items.get("seq-1")!.endFrame;
    const act2Before = tree.items.get("act-2")!.startFrame;

    const result = trimStructureRight(tree, "act-1", delta, "shell-resize");
    expect(result.blocked).toBe(false);
    expect(result.next.items.get("seq-1")!.endFrame).toBe(seq1EndBefore);
    expect(result.next.items.get("act-2")!.startFrame).toBe(act2Before + delta);

    const rebuilt = roundtripViaTimelineData(
      result.next,
      JOURNEY_TD,
      PROJECT_SEC,
    );
    expectSameFrames(result.next, rebuilt, [
      "act-1",
      "act-2",
      "seq-1",
      "seq-2",
    ]);
  });

  it("static blocks match tree frames after roundtrip", () => {
    const tree = buildJourney121Tree(PROJECT_SEC);
    const delta = secToFrame(10, DEFAULT_FRAME_RATE);
    const trimmed = trimStructureRight(tree, "scene-1", delta);
    const rebuilt = roundtripViaTimelineData(
      trimmed.next,
      JOURNEY_TD,
      PROJECT_SEC,
    );
    const td = treeToTimelineData(trimmed.next, JOURNEY_TD);

    for (const kind of ["act", "sequence", "scene", "shot"] as const) {
      const blocks = projectStructureBlocksFromTree({
        tree: rebuilt,
        timelineData: td,
        kind,
        viewStartSec: 0,
        viewEndSec: PROJECT_SEC,
        pxPerSec: 10,
      });
      for (const block of blocks) {
        const item = rebuilt.items.get(block.id);
        expect(item).toBeDefined();
        expect(block.startSec * DEFAULT_FRAME_RATE).toBeCloseTo(
          item!.startFrame,
          0,
        );
        expect(block.endSec * DEFAULT_FRAME_RATE).toBeCloseTo(
          item!.endFrame,
          0,
        );
      }
    }
  });
});
