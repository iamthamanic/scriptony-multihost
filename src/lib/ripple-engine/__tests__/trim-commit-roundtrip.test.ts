/**
 * Reproduces post-trim snap-back: pct committed at new project duration,
 * rebuild with stale projectDurationSec clips blocks to old ruler end.
 */
import { describe, expect, it } from "vitest";
import {
  buildTimelineTree,
  treeToTimelineData,
} from "../../timeline-tree/buildTree";
import type { TimelineData } from "../../timeline-tree/types";
import {
  buildJourney121Tree,
  trimStructureRight,
} from "../../timeline-tree/__tests__/test-helpers";

const ORIGINAL_PROJECT_SEC = 200;

function journeyTimelineData(): TimelineData {
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
    sequences: [],
    scenes: [],
    shots: [],
  } as unknown as TimelineData;
}

describe("trim commit roundtrip (snap-back regression)", () => {
  it("stale projectDurationSec shrinks act after elastic right-grow", () => {
    const tree = buildJourney121Tree();
    const grow = trimStructureRight(tree, "act-1", 600);
    const committedEnd = grow.next.items.get("act-1")!.endFrame;

    const committed = treeToTimelineData(grow.next, journeyTimelineData());
    // Legacy cache without VET layout ruler — reproduces production snap-back.
    const legacyCommitted = {
      ...committed,
      layoutProjectDurationSec: undefined,
    };
    const rebuilt = buildTimelineTree({
      timelineData: legacyCommitted,
      projectDurationSec: ORIGINAL_PROJECT_SEC,
    });

    const rebuiltEnd = rebuilt.items.get("act-1")!.endFrame;
    expect(rebuiltEnd).toBeLessThan(committedEnd);
  });

  it("layoutProjectDurationSec preserves committed frames on rebuild", () => {
    const tree = buildJourney121Tree();
    const grow = trimStructureRight(tree, "act-1", 600);
    const committedEnd = grow.next.items.get("act-1")!.endFrame;

    const committed = treeToTimelineData(grow.next, journeyTimelineData());
    const rebuilt = buildTimelineTree({
      timelineData: committed,
      projectDurationSec: ORIGINAL_PROJECT_SEC,
    });

    expect(rebuilt.items.get("act-1")!.endFrame).toBe(committedEnd);
    expect(rebuilt.projectDurationFrames).toBe(grow.next.projectDurationFrames);
  });
});
