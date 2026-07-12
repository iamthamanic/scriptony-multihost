import { describe, expect, it } from "vitest";
import { buildTimelineTree } from "../buildTree";
import { projectStructureBlocksFromTree } from "../projectBlocks";
import { makeFilmTimelineData } from "./test-helpers";

describe("projectStructureBlocksFromTree", () => {
  it("projects packed act spans without implicit gaps", () => {
    const td = makeFilmTimelineData();
    td.acts![0]!.metadata = { pct_from: 0, pct_to: 20 };
    td.acts![1]!.metadata = { pct_from: 40, pct_to: 60 };
    const tree = buildTimelineTree({
      timelineData: td,
      projectDurationSec: 100,
    });
    const blocks = projectStructureBlocksFromTree({
      tree,
      timelineData: td,
      kind: "act",
      viewStartSec: 0,
      viewEndSec: 100,
      pxPerSec: 10,
    });
    expect(blocks).toHaveLength(2);
    blocks.sort((a, b) => a.startSec - b.startSec);
    expect(blocks[0]!.endSec).toBeCloseTo(blocks[1]!.startSec, 1);
    expect(blocks[0]!.x).toBe(0);
    expect(blocks[1]!.x).toBeCloseTo(blocks[0]!.width, 0);
  });
});
