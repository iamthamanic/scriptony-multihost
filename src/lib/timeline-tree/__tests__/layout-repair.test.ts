import { describe, expect, it } from "vitest";
import { actsHaveRawFilmLayoutIssues } from "../../timeline-act-layout";
import {
  filmLayoutMetadataDiffers,
  filmTimelineNeedsLayoutRepair,
  repairFilmTimelineLayout,
} from "../layout-repair";
import { makeFilmTimelineData } from "./test-helpers";
import type { TimelineData } from "../types";

describe("filmTimelineNeedsLayoutRepair", () => {
  it("detects act pct gaps", () => {
    const data = {
      ...makeFilmTimelineData(),
      acts: [
        {
          id: "act-1",
          orderIndex: 0,
          metadata: { pct_from: 0, pct_to: 20 },
        },
        {
          id: "act-2",
          orderIndex: 1,
          metadata: { pct_from: 40, pct_to: 60 },
        },
      ],
    } as unknown as TimelineData;

    expect(actsHaveRawFilmLayoutIssues(data.acts ?? [], 100)).toBe(true);
    expect(filmTimelineNeedsLayoutRepair(data, 100)).toBe(true);
  });

  it("repairs sequence pct gaps without act issues", () => {
    const data = {
      ...makeFilmTimelineData(),
      sequences: [
        {
          id: "seq-1",
          actId: "act-1",
          orderIndex: 0,
          metadata: { pct_from: 0, pct_to: 40 },
        },
        {
          id: "seq-1b",
          actId: "act-1",
          orderIndex: 1,
          metadata: { pct_from: 60, pct_to: 100 },
        },
        ...(makeFilmTimelineData().sequences ?? []).filter(
          (s) => s.actId !== "act-1",
        ),
      ],
    } as unknown as TimelineData;

    expect(actsHaveRawFilmLayoutIssues(data.acts ?? [], 120)).toBe(false);
    expect(filmTimelineNeedsLayoutRepair(data, 120)).toBe(true);

    const repaired = repairFilmTimelineLayout(data, 120);
    const seqA = repaired.sequences?.find((s) => s.id === "seq-1");
    const seqB = repaired.sequences?.find((s) => s.id === "seq-1b");
    expect(seqA?.metadata?.pct_to).toBeCloseTo(40, 0);
    expect(seqB?.metadata?.pct_from).toBeCloseTo(40, 0);
    expect(filmLayoutMetadataDiffers(data, repaired)).toBe(true);
  });

  it("repairs scene pct gaps within a sequence", () => {
    const base = makeFilmTimelineData();
    const data = {
      ...base,
      scenes: [
        {
          id: "scene-1",
          sequenceId: "seq-1",
          orderIndex: 0,
          metadata: { pct_from: 0, pct_to: 30 },
        },
        {
          id: "scene-1b",
          sequenceId: "seq-1",
          orderIndex: 1,
          metadata: { pct_from: 50, pct_to: 100 },
        },
        ...(base.scenes ?? []).filter((s) => s.sequenceId !== "seq-1"),
      ],
    } as unknown as TimelineData;

    expect(filmTimelineNeedsLayoutRepair(data, 120)).toBe(true);
    const repaired = repairFilmTimelineLayout(data, 120);
    const a = repaired.scenes?.find((s) => s.id === "scene-1");
    const b = repaired.scenes?.find((s) => s.id === "scene-1b");
    expect(a?.metadata?.pct_to).toBeCloseTo(30, 0);
    expect(b?.metadata?.pct_from).toBeCloseTo(30, 0);
  });
});
