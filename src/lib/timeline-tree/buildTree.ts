/**
 * VETILALORAPP — TimelineData → TimelineTree (sole raw pct consumer).
 * Location: src/lib/timeline-tree/buildTree.ts
 */

import type { TimelineData } from "./types";
import {
  dedupeActsById,
  actsHaveRawOverlappingPct,
  resolveFilmActGlobalSpans,
  sortActsByOrder,
} from "../timeline-act-layout";
import type { TimelineItem, TimelineTree } from "./types";
import {
  DEFAULT_FRAME_RATE,
  DEFAULT_MIN_ITEM_DURATION_FRAMES,
  frameToSec,
  secToFrame,
  syncItemDuration,
} from "./types";
import { packShotsInSceneFrames } from "./shot-pack";
import { rebuildChildrenOf } from "./tree-utils";
import {
  fitParentShellsToChildHull,
  framesToProjectPct,
  framesToRelativePct,
  packSequentialFrameGaps,
  readPctMetadata,
  relativePctToFrames,
} from "./pack";
import { repairTimelineTree } from "./repair";
import { logTimelineTreeDiagnosis } from "../ripple-engine/structure-trim-debug";

export interface BuildTimelineTreeInput {
  timelineData: TimelineData;
  projectDurationSec: number;
  frameRate?: number;
}

/** Max(stored ruler, VET layout hint) so pct decode matches last trim/move commit. */
export function resolveProjectDurationSecForBuild(
  input: BuildTimelineTreeInput,
): number {
  const base = Math.max(1e-6, input.projectDurationSec);
  const layout = input.timelineData.layoutProjectDurationSec;
  if (typeof layout === "number" && Number.isFinite(layout) && layout > base) {
    return layout;
  }
  return base;
}

function addItem(
  items: Map<string, TimelineItem>,
  input: Omit<TimelineItem, "durationFrames">,
): void {
  const item: TimelineItem = {
    ...input,
    durationFrames: Math.max(0, input.endFrame - input.startFrame),
  };
  syncItemDuration(item);
  items.set(item.id, item);
}

function resolveSceneSequenceId(scene: {
  id: string;
  sequenceId?: string;
  sequence_id?: string;
}): string | undefined {
  return scene.sequenceId ?? scene.sequence_id;
}

type TimelineSceneRow = NonNullable<TimelineData["scenes"]>[number];

function attachScenesToSequenceInTree(
  items: Map<string, TimelineItem>,
  sequenceId: string,
  seqScenes: TimelineSceneRow[],
): void {
  const seqItem = items.get(sequenceId);
  if (!seqItem || seqItem.kind !== "sequence") return;

  const seqStartFrame = seqItem.startFrame;
  const seqEndFrame = seqItem.endFrame;
  const seqDurFrames = Math.max(1, seqEndFrame - seqStartFrame);
  const sceneFallbackFrames = Math.floor(
    seqDurFrames / Math.max(1, seqScenes.length),
  );

  const sceneFrameWork: Array<{
    scene: (typeof seqScenes)[number];
    sceneIndex: number;
    startFrame: number;
    endFrame: number;
  }> = [];

  seqScenes.forEach((scene, sceneIndex) => {
    const { valid, from, to } = readPctMetadata(scene);
    if (valid) {
      const child = relativePctToFrames(
        seqStartFrame,
        seqDurFrames,
        from!,
        to!,
      );
      sceneFrameWork.push({
        scene,
        sceneIndex,
        startFrame: child.startFrame,
        endFrame: child.endFrame,
      });
      return;
    }
    const startFrame = seqStartFrame + sceneIndex * sceneFallbackFrames;
    const endFrame =
      sceneIndex === seqScenes.length - 1
        ? seqEndFrame
        : startFrame + sceneFallbackFrames;
    sceneFrameWork.push({ scene, sceneIndex, startFrame, endFrame });
  });

  packSequentialFrameGaps(sceneFrameWork);

  for (const sceneRow of sceneFrameWork) {
    const { scene, sceneIndex, startFrame, endFrame } = sceneRow;
    addItem(items, {
      id: scene.id,
      kind: "scene",
      parentId: sequenceId,
      orderIndex: scene.orderIndex ?? sceneIndex,
      startFrame,
      endFrame,
    });
  }
}

/** Film layout: acts → sequences → scenes → shots (frame-native pct). */
export function buildTimelineTree(input: BuildTimelineTreeInput): TimelineTree {
  const frameRate = input.frameRate ?? DEFAULT_FRAME_RATE;
  const durationSec = resolveProjectDurationSecForBuild(input);
  const projectDurationFrames = Math.max(1, secToFrame(durationSec, frameRate));

  const td = input.timelineData;
  const acts = sortActsByOrder(dedupeActsById(td.acts ?? []));
  const items = new Map<string, TimelineItem>();

  const sequences = [...(td.sequences ?? [])].sort(
    (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
  );
  const scenes = [...(td.scenes ?? [])].sort(
    (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
  );

  const totalActs = acts.length || 1;
  const actDurationFallback = durationSec / totalActs;

  const actFrameWork: Array<{
    act: (typeof acts)[number];
    actIndex: number;
    startFrame: number;
    endFrame: number;
  }> = [];

  if (actsHaveRawOverlappingPct(acts, durationSec)) {
    const actSpans = resolveFilmActGlobalSpans(acts, durationSec);
    acts.forEach((act, actIndex) => {
      const span = actSpans.get(act.id);
      actFrameWork.push({
        act,
        actIndex,
        startFrame: secToFrame(
          span?.startSec ?? actIndex * actDurationFallback,
          frameRate,
        ),
        endFrame: secToFrame(
          span?.endSec ?? (actIndex + 1) * actDurationFallback,
          frameRate,
        ),
      });
    });
  } else {
    acts.forEach((act, actIndex) => {
      const { valid, from, to } = readPctMetadata(act);
      if (valid) {
        const span = relativePctToFrames(0, projectDurationFrames, from!, to!);
        actFrameWork.push({
          act,
          actIndex,
          startFrame: span.startFrame,
          endFrame: span.endFrame,
        });
        return;
      }
      const slot = Math.floor(projectDurationFrames / totalActs);
      actFrameWork.push({
        act,
        actIndex,
        startFrame: actIndex * slot,
        endFrame:
          actIndex === totalActs - 1
            ? projectDurationFrames
            : (actIndex + 1) * slot,
      });
    });
    packSequentialFrameGaps(actFrameWork);
  }

  for (const actRow of actFrameWork) {
    const {
      act,
      actIndex,
      startFrame: actStartFrame,
      endFrame: actEndFrame,
    } = actRow;
    const actDurFrames = Math.max(1, actEndFrame - actStartFrame);

    addItem(items, {
      id: act.id,
      kind: "act",
      parentId: null,
      orderIndex: act.orderIndex ?? act.actNumber ?? actIndex,
      startFrame: actStartFrame,
      endFrame: actEndFrame,
    });

    const actSequences = sequences.filter((s) => s.actId === act.id);
    const seqFallbackFrames = Math.floor(
      actDurFrames / Math.max(1, actSequences.length),
    );

    const seqFrameWork: Array<{
      sequence: (typeof actSequences)[number];
      seqIndex: number;
      startFrame: number;
      endFrame: number;
    }> = [];

    actSequences.forEach((sequence, seqIndex) => {
      const { valid, from, to } = readPctMetadata(sequence);
      if (valid) {
        const child = relativePctToFrames(
          actStartFrame,
          actDurFrames,
          from!,
          to!,
        );
        seqFrameWork.push({
          sequence,
          seqIndex,
          startFrame: child.startFrame,
          endFrame: child.endFrame,
        });
        return;
      }
      const startFrame = actStartFrame + seqIndex * seqFallbackFrames;
      const endFrame =
        seqIndex === actSequences.length - 1
          ? actEndFrame
          : startFrame + seqFallbackFrames;
      seqFrameWork.push({ sequence, seqIndex, startFrame, endFrame });
    });

    packSequentialFrameGaps(seqFrameWork);

    for (const seqRow of seqFrameWork) {
      const {
        sequence,
        seqIndex,
        startFrame: seqStartFrame,
        endFrame: seqEndFrame,
      } = seqRow;

      addItem(items, {
        id: sequence.id,
        kind: "sequence",
        parentId: act.id,
        orderIndex: sequence.orderIndex ?? seqIndex,
        startFrame: seqStartFrame,
        endFrame: seqEndFrame,
      });

      const seqScenes = scenes.filter(
        (sc) => resolveSceneSequenceId(sc) === sequence.id,
      );
      attachScenesToSequenceInTree(items, sequence.id, seqScenes);
    }
  }

  const scenesBySequence = new Map<string, TimelineSceneRow[]>();
  for (const scene of scenes) {
    const seqId = resolveSceneSequenceId(scene);
    if (!seqId) continue;
    const list = scenesBySequence.get(seqId) ?? [];
    list.push(scene);
    scenesBySequence.set(seqId, list);
  }
  for (const [sequenceId, seqScenes] of scenesBySequence) {
    if (!items.has(sequenceId)) continue;
    if (seqScenes.every((scene) => items.has(scene.id))) continue;
    attachScenesToSequenceInTree(items, sequenceId, seqScenes);
  }

  const shotsByScene = new Map<string, NonNullable<TimelineData["shots"]>>();
  for (const shot of td.shots ?? []) {
    const sceneId =
      (shot as { sceneId?: string; scene_id?: string }).sceneId ??
      (shot as { scene_id?: string }).scene_id;
    if (!sceneId) continue;
    const list = shotsByScene.get(sceneId) ?? [];
    list.push(shot);
    shotsByScene.set(sceneId, list);
  }

  for (const sceneItem of items.values()) {
    if (sceneItem.kind !== "scene") continue;
    const sceneShots = shotsByScene.get(sceneItem.id);
    if (!sceneShots?.length) continue;

    const packed = packShotsInSceneFrames({
      sceneId: sceneItem.id,
      sceneStartFrame: sceneItem.startFrame,
      sceneEndFrame: sceneItem.endFrame,
      shots: sceneShots,
      frameRate,
      minDurationFrames: DEFAULT_MIN_ITEM_DURATION_FRAMES,
    });

    const sceneDurFrames = Math.max(
      1,
      sceneItem.endFrame - sceneItem.startFrame,
    );
    const orderedShots = [...sceneShots].sort(
      (a, b) =>
        (a.orderIndex ?? (a as { order_index?: number }).order_index ?? 0) -
        (b.orderIndex ?? (b as { order_index?: number }).order_index ?? 0),
    );
    const allShotPct = orderedShots.every(
      (shot) => readPctMetadata(shot).valid,
    );

    if (allShotPct) {
      for (const [index, shot] of orderedShots.entries()) {
        const { from, to } = readPctMetadata(shot);
        const span = relativePctToFrames(
          sceneItem.startFrame,
          sceneDurFrames,
          from!,
          to!,
        );
        addItem(items, {
          id: shot.id,
          kind: "shot",
          parentId: sceneItem.id,
          orderIndex: shot.orderIndex ?? index,
          startFrame: span.startFrame,
          endFrame: span.endFrame,
          locked: !!(shot as { locked?: boolean }).locked,
        });
      }
      continue;
    }

    for (const row of packed) {
      addItem(items, {
        id: row.shotId,
        kind: "shot",
        parentId: row.sceneId,
        orderIndex: row.orderIndex,
        startFrame: row.startFrame,
        endFrame: row.endFrame,
        locked: row.locked,
      });
    }
  }

  const tree: TimelineTree = {
    items,
    childrenOf: rebuildChildrenOf(items),
    projectDurationFrames,
    frameRate,
  };

  fitParentShellsToChildHull(tree);

  const repair = repairTimelineTree(tree, {
    minItemDurationFrames: DEFAULT_MIN_ITEM_DURATION_FRAMES,
  });
  if (repair.errorsBefore.length > 0) {
    logTimelineTreeDiagnosis("repaired after buildTree", repair.errorsAfter);
  }

  return tree;
}

export interface FilmShotSpanFromTree {
  shotId: string;
  sceneId: string;
  startSec: number;
  endSec: number;
  orderIndex: number;
}

/** Global shot spans from a packed TimelineTree (clip migration / geometry). */
export function listFilmShotSpansFromTree(
  tree: TimelineTree,
): FilmShotSpanFromTree[] {
  const { frameRate } = tree;
  const spans: FilmShotSpanFromTree[] = [];

  for (const item of tree.items.values()) {
    if (item.kind !== "shot" || !item.parentId) continue;
    spans.push({
      shotId: item.id,
      sceneId: item.parentId,
      startSec: frameToSec(item.startFrame, frameRate),
      endSec: frameToSec(item.endFrame, frameRate),
      orderIndex: item.orderIndex,
    });
  }

  spans.sort((a, b) => a.startSec - b.startSec);
  return spans;
}

/** Inverse of buildTimelineTree — writes legacy pct metadata for persistence. */
export function treeToTimelineData(
  tree: TimelineTree,
  base: TimelineData,
): TimelineData {
  const { frameRate } = tree;

  const actSpans = new Map<string, { pct_from: number; pct_to: number }>();
  const rootActs = tree.childrenOf.get(null) ?? [];
  for (const act of rootActs) {
    actSpans.set(
      act.id,
      framesToProjectPct(
        tree.projectDurationFrames,
        act.startFrame,
        act.endFrame,
      ),
    );
  }

  const acts = sortActsByOrder(
    dedupeActsById(base.acts ?? []).map((act) => {
      const pct = actSpans.get(act.id);
      const item = tree.items.get(act.id);
      if (!pct) return act;
      return {
        ...act,
        // Move/Reorder: tree orderIndex is canonical, otherwise local rebuild reverts the swap.
        ...(item ? { orderIndex: item.orderIndex } : {}),
        metadata: { ...(act.metadata ?? {}), ...pct },
      };
    }),
  );

  const sequences = (base.sequences ?? []).map((seq) => {
    const item = tree.items.get(seq.id);
    const parent = item?.parentId ? tree.items.get(item.parentId) : null;
    if (!item || !parent) return seq;
    const pct = framesToRelativePct(
      parent.startFrame,
      parent.durationFrames,
      item.startFrame,
      item.endFrame,
    );
    return {
      ...seq,
      orderIndex: item.orderIndex,
      actId: item.parentId ?? seq.actId,
      metadata: {
        ...(seq.metadata ?? {}),
        ...pct,
      },
    };
  });

  const scenes = (base.scenes ?? []).map((scene) => {
    const item = tree.items.get(scene.id);
    const parent = item?.parentId ? tree.items.get(item.parentId) : null;
    if (!item || !parent) return scene;
    const pct = framesToRelativePct(
      parent.startFrame,
      parent.durationFrames,
      item.startFrame,
      item.endFrame,
    );
    return {
      ...scene,
      orderIndex: item.orderIndex,
      sequenceId: item.parentId ?? scene.sequenceId,
      metadata: {
        ...(scene.metadata ?? {}),
        ...pct,
      },
    };
  });

  const shots = (base.shots ?? []).map((shot) => {
    const item = tree.items.get(shot.id);
    if (!item) return shot;
    const durationSeconds = frameToSec(item.durationFrames, frameRate);
    const parent = item.parentId ? tree.items.get(item.parentId) : null;
    const pct = parent
      ? framesToRelativePct(
          parent.startFrame,
          parent.durationFrames,
          item.startFrame,
          item.endFrame,
        )
      : undefined;
    return {
      ...shot,
      orderIndex: item.orderIndex,
      durationSeconds,
      duration: `${Math.round(durationSeconds)}s`,
      metadata: {
        ...(shot.metadata ?? {}),
        ...(pct ?? {}),
      },
    };
  });

  return {
    ...base,
    acts: acts as TimelineData["acts"],
    sequences,
    scenes,
    shots: shots as TimelineData["shots"],
    layoutProjectDurationSec: frameToSec(tree.projectDurationFrames, frameRate),
  };
}
