/**
 * Tests for global long-running load progress helpers.
 * Location: src/lib/loading/__tests__/global-loading-progress.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  clampLoadingPercent,
  pickPrimaryLoadingTask,
  type ActiveLoadingTask,
} from "../global-loading-progress";

function task(
  id: string,
  startedAt: number,
  detailVisible: boolean,
): ActiveLoadingTask {
  return {
    id,
    title: id,
    percent: 50,
    message: "msg",
    startedAt,
    detailVisible,
  };
}

describe("global-loading-progress", () => {
  it("pickPrimaryLoadingTask returns null when none detail-visible", () => {
    expect(
      pickPrimaryLoadingTask([task("a", 100, false), task("b", 200, false)]),
    ).toBeNull();
  });

  it("pickPrimaryLoadingTask returns newest detail-visible task", () => {
    const primary = pickPrimaryLoadingTask([
      task("a", 100, true),
      task("b", 300, true),
      task("c", 200, true),
    ]);
    expect(primary?.id).toBe("b");
  });

  it("clampLoadingPercent bounds 0–100", () => {
    expect(clampLoadingPercent(-5)).toBe(0);
    expect(clampLoadingPercent(150)).toBe(100);
    expect(clampLoadingPercent(42.6)).toBe(43);
  });
});
