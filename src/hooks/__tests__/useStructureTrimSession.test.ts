/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStructureTrimSession } from "../useStructureTrimSession";
import { buildTestTree } from "../../lib/timeline-tree/__tests__/test-helpers";
import { resizeStructureItem } from "../../lib/ripple-engine/hierarchical";
import { cloneTimelineTree } from "../../lib/timeline-tree/tree-utils";

vi.mock("../../lib/ripple-engine/hierarchical", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../../lib/ripple-engine/hierarchical")
    >();
  return { ...actual, resizeStructureItem: vi.fn(actual.resizeStructureItem) };
});

describe("useStructureTrimSession", () => {
  const pxPerFrameRef = { current: 2 };
  const viewStartFrameRef = { current: 0 };
  let tree = buildTestTree();

  beforeEach(() => {
    tree = buildTestTree();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderSession() {
    const onCommit = vi.fn();
    const onRevert = vi.fn();
    const hook = renderHook(() =>
      useStructureTrimSession({
        tree,
        pxPerFrameRef,
        viewStartFrameRef,
        getSnapEdges: () => [],
        getContainers: () => ({}),
        onCommit,
        onRevert,
      }),
    );
    return { ...hook, onCommit, onRevert };
  }

  it("moveTrim_computes_from_frozen_tree", () => {
    const { result } = renderSession();
    const scene = tree.items.get("scene-1")!;

    act(() => {
      result.current.startTrim({
        itemId: "scene-1",
        kind: "scene",
        side: "right",
        clientX: 0,
        pointerId: 1,
      });
    });

    act(() => {
      result.current.moveTrim(60);
    });

    expect(resizeStructureItem).toHaveBeenCalled();
    const call = vi.mocked(resizeStructureItem).mock.calls.at(-1)?.[0];
    // KISS/SOLID: frozen tree muss ein Klon sein, nicht die Live-Referenz.
    expect(call?.tree).not.toBe(tree);
    // Input-Tree ist eingefroren — endFrame des Drag-Items ist unverändert.
    expect(call?.tree.items.get("scene-1")?.endFrame).toBe(scene.endFrame);
    // Snapshot-Disziplin: requested boundary = start + deltaFrames (30 @ 2 px/frame, 60px).
    expect(call?.newBoundaryFrame).toBe(scene.endFrame + 30);
  });

  it("startTrim_freezes_tree_via_clone", () => {
    const { result } = renderSession();
    const scene = tree.items.get("scene-1")!;
    const startEndFrame = scene.endFrame;

    act(() => {
      result.current.startTrim({
        itemId: "scene-1",
        kind: "scene",
        side: "right",
        clientX: 0,
        pointerId: 1,
      });
    });

    // Mutate the live tree after startTrim — frozen snapshot must not move.
    const live = tree.items.get("scene-1")!;
    live.endFrame = startEndFrame + 9999;
    live.startFrame = startEndFrame + 9990;

    act(() => {
      result.current.moveTrim(60);
    });

    const call = vi.mocked(resizeStructureItem).mock.calls.at(-1)?.[0];
    expect(call?.tree.items.get("scene-1")?.endFrame).toBe(startEndFrame);

    // Sanity: cloneTimelineTree liefert strukturgleichen, aber unabhängigen Tree.
    const probe = cloneTimelineTree(tree);
    expect(probe.items.get("scene-1")?.endFrame).toBe(startEndFrame + 9999);
  });

  it("moveTrim_schedules_rAF", () => {
    const rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation(() => 42 as unknown as number);
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");

    const { result } = renderSession();

    act(() => {
      result.current.startTrim({
        itemId: "scene-1",
        kind: "scene",
        side: "right",
        clientX: 0,
        pointerId: 1,
      });
    });

    act(() => {
      result.current.moveTrim(60);
    });

    expect(rafSpy).toHaveBeenCalledTimes(1);
    expect(cancelSpy).not.toHaveBeenCalled();

    // Zweiter moveTrim muss vorherigen rAF abbrechen.
    act(() => {
      result.current.moveTrim(120);
    });

    expect(cancelSpy).toHaveBeenCalledWith(42);
    expect(rafSpy).toHaveBeenCalledTimes(2);

    rafSpy.mockRestore();
    cancelSpy.mockRestore();
  });

  it("endTrim_calls_onCommit_once", async () => {
    const { result, onCommit } = renderSession();

    act(() => {
      result.current.startTrim({
        itemId: "scene-1",
        kind: "scene",
        side: "right",
        clientX: 0,
        pointerId: 1,
      });
      result.current.moveTrim(120);
    });

    await act(async () => {
      await result.current.endTrim();
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("failed_commit_triggers_revert", async () => {
    const onCommit = vi.fn().mockRejectedValue(new Error("fail"));
    const onRevert = vi.fn();

    const { result } = renderHook(() =>
      useStructureTrimSession({
        tree,
        pxPerFrameRef,
        viewStartFrameRef,
        getSnapEdges: () => [],
        getContainers: () => ({}),
        onCommit,
        onRevert,
      }),
    );

    act(() => {
      result.current.startTrim({
        itemId: "scene-1",
        kind: "scene",
        side: "right",
        clientX: 0,
        pointerId: 1,
      });
    });

    act(() => {
      result.current.moveTrim(200);
    });

    await act(async () => {
      await result.current.endTrim();
    });

    expect(onCommit).toHaveBeenCalled();
    expect(onRevert).toHaveBeenCalled();
  });

  it("blocked_skips_commit", async () => {
    const lockedTree = buildTestTree();
    lockedTree.items.get("shot-1")!.locked = true;
    const onCommit = vi.fn();
    const onRevert = vi.fn();

    const { result } = renderHook(() =>
      useStructureTrimSession({
        tree: lockedTree,
        pxPerFrameRef,
        viewStartFrameRef,
        getSnapEdges: () => [],
        getContainers: () => ({}),
        onCommit,
        onRevert,
      }),
    );

    act(() => {
      result.current.startTrim({
        itemId: "shot-1",
        kind: "shot",
        side: "right",
        clientX: 0,
        pointerId: 1,
      });
      result.current.moveTrim(60);
    });

    await act(async () => {
      await result.current.endTrim();
    });

    expect(onCommit).not.toHaveBeenCalled();
  });
});
