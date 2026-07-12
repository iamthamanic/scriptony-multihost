/**
 * structure-create-fields — numbering/orderIndex for Act/Sequence/Scene creates.
 * Shared by VideoEditorTimeline (+) and aligned with useHierarchyCRUD.
 * Location: src/lib/structure/structure-create-fields.ts
 */

import type { Act, Scene, Sequence } from "../types";

export function nextActCreatePayload(
  acts: Act[],
  actLabel: string,
): Pick<Act, "actNumber" | "title" | "orderIndex"> {
  const maxNum =
    acts.length > 0 ? Math.max(...acts.map((a) => a.actNumber || 0)) : 0;
  const newNum = maxNum + 1;
  return {
    actNumber: newNum,
    title: `${actLabel} ${newNum}`,
    orderIndex: acts.length,
  };
}

export function nextSequenceCreatePayload(
  sequences: Sequence[],
  actId: string,
  sequenceLabel: string,
): Pick<Sequence, "sequenceNumber" | "title" | "orderIndex"> {
  const actSeqs = sequences.filter((s) => s.actId === actId);
  const maxNum =
    actSeqs.length > 0
      ? Math.max(...actSeqs.map((s) => s.sequenceNumber || 0))
      : 0;
  const newNum = maxNum + 1;
  return {
    sequenceNumber: newNum,
    title: `${sequenceLabel} ${newNum}`,
    orderIndex: actSeqs.length,
  };
}

export function nextSceneCreatePayload(
  scenes: Scene[],
  sequenceId: string,
  sceneLabel: string,
): Pick<Scene, "sceneNumber" | "title" | "orderIndex"> {
  const seqScenes = scenes.filter((s) => s.sequenceId === sequenceId);
  const maxNum =
    seqScenes.length > 0
      ? Math.max(...seqScenes.map((s) => s.sceneNumber || 0))
      : 0;
  const newNum = maxNum + 1;
  return {
    sceneNumber: newNum,
    title: `${sceneLabel} ${newNum}`,
    orderIndex: seqScenes.length,
  };
}
