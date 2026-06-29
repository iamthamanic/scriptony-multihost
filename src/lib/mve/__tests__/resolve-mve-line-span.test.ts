/**
 * Unit tests for resolve-mve-line-span.
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_EMPTY_LINE_SHELL_SEC,
  maxContentEndSecInScene,
  resolveMveLineSpan,
} from "../resolve-mve-line-span";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { SceneTimeBlock } from "../resolve-scene-at-timeline-sec";

const sceneBlock: SceneTimeBlock = {
  id: "scene-1",
  startSec: 10,
  endSec: 40,
};

function line(id: string, text: string, orderIndex: number): MveLine {
  return {
    id,
    sceneId: "scene-1",
    orderIndex,
    type: "dialogue",
    status: "draft",
    text,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("resolveMveLineSpan", () => {
  it("uses WPM width for text (10 words @ 150 WPM ≈ 4s)", () => {
    const text = "one two three four five six seven eight nine ten";
    const span = resolveMveLineSpan({
      line: line("l1", text, 0),
      sceneBlock,
      linesInScene: [line("l1", text, 0)],
    });
    expect(span.startSec).toBe(10);
    expect(span.durationSec).toBeCloseTo(4, 0);
    expect(span.endSec).toBeCloseTo(14, 0);
    expect(span.source).toBe("wpm");
  });

  it("first empty line spans full scene shell", () => {
    const span = resolveMveLineSpan({
      line: line("l1", "", 0),
      sceneBlock,
      linesInScene: [line("l1", "", 0)],
    });
    expect(span.startSec).toBe(10);
    expect(span.endSec).toBe(40);
    expect(span.durationSec).toBe(30);
    expect(span.source).toBe("shell");
  });

  it("second empty line uses default shell width", () => {
    const l1 = line("l1", "", 0);
    const l2 = line("l2", "", 1);
    const span1 = resolveMveLineSpan({
      line: l1,
      sceneBlock,
      linesInScene: [l1, l2],
    });
    const span2 = resolveMveLineSpan({
      line: l2,
      sceneBlock,
      linesInScene: [l1, l2],
    });
    expect(span1.endSec).toBe(40);
    expect(span2.startSec).toBe(40);
    expect(span2.durationSec).toBe(DEFAULT_EMPTY_LINE_SHELL_SEC);
    expect(span2.source).toBe("shell");
  });

  it("stacks text lines sequentially", () => {
    const l1 = line("l1", "one two three four five", 0);
    const l2 = line("l2", "one two three four five", 1);
    const span2 = resolveMveLineSpan({
      line: l2,
      sceneBlock,
      linesInScene: [l1, l2],
    });
    const span1 = resolveMveLineSpan({
      line: l1,
      sceneBlock,
      linesInScene: [l1, l2],
    });
    expect(span2.startSec).toBeCloseTo(span1.endSec, 5);
  });
});

describe("maxContentEndSecInScene", () => {
  it("returns max end among lines with text", () => {
    const l1 = line(
      "l1",
      "one two three four five six seven eight nine ten",
      0,
    );
    const end = maxContentEndSecInScene(sceneBlock, [l1]);
    expect(end).toBeCloseTo(14, 0);
  });

  it("does not shrink below scene end when all lines empty", () => {
    const end = maxContentEndSecInScene(sceneBlock, [line("l1", "", 0)]);
    expect(end).toBe(40);
  });

  it("extends scene when second empty shell exceeds scene end", () => {
    const l1 = line("l1", "", 0);
    const l2 = line("l2", "", 1);
    const end = maxContentEndSecInScene(sceneBlock, [l1, l2]);
    expect(end).toBe(40 + DEFAULT_EMPTY_LINE_SHELL_SEC);
  });
});
