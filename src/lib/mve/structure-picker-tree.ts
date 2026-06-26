/**
 * Build Act → Sequence → Scene hierarchy for MVE lane-link picker (T30).
 * Location: src/lib/mve/structure-picker-tree.ts
 */

import type { Act, Scene, Sequence } from "../types";

export interface StructurePickerActNode {
  id: string;
  label: string;
  sequences: StructurePickerSequenceNode[];
}

export interface StructurePickerSequenceNode {
  id: string;
  label: string;
  scenes: StructurePickerSceneNode[];
}

export interface StructurePickerSceneNode {
  id: string;
  label: string;
}

function actLabel(act: Act, index: number): string {
  const title = act.title?.trim();
  return title
    ? `Akt ${act.actNumber}: ${title}`
    : `Akt ${act.actNumber ?? index + 1}`;
}

function sequenceLabel(seq: Sequence, index: number): string {
  const title = seq.title?.trim();
  return title
    ? `Sequenz ${seq.sequenceNumber}: ${title}`
    : `Sequenz ${seq.sequenceNumber ?? index + 1}`;
}

function sceneLabel(scene: Scene): string {
  const title = scene.title?.trim();
  const num = scene.sceneNumber ?? scene.number;
  if (title && num != null) return `Szene ${num}: ${title}`;
  if (title) return title;
  if (num != null) return `Szene ${num}`;
  return "Szene";
}

export function buildStructurePickerTree(
  acts: Act[],
  sequences: Sequence[],
  scenes: Scene[],
): StructurePickerActNode[] {
  const sortedActs = [...acts].sort(
    (a, b) => (a.orderIndex ?? a.actNumber) - (b.orderIndex ?? b.actNumber),
  );
  const sortedSequences = [...sequences].sort(
    (a, b) =>
      (a.orderIndex ?? a.sequenceNumber) - (b.orderIndex ?? b.sequenceNumber),
  );
  const sortedScenes = [...scenes].sort(
    (a, b) =>
      (a.orderIndex ?? a.sceneNumber ?? 0) -
      (b.orderIndex ?? b.sceneNumber ?? 0),
  );

  const scenesBySequence = new Map<string, StructurePickerSceneNode[]>();
  const orphanScenes: StructurePickerSceneNode[] = [];

  for (const scene of sortedScenes) {
    const node: StructurePickerSceneNode = {
      id: scene.id,
      label: sceneLabel(scene),
    };
    const seqId = scene.sequenceId?.trim();
    if (seqId) {
      const list = scenesBySequence.get(seqId) ?? [];
      list.push(node);
      scenesBySequence.set(seqId, list);
    } else {
      orphanScenes.push(node);
    }
  }

  const sequencesByAct = new Map<string, StructurePickerSequenceNode[]>();
  const orphanSequences: StructurePickerSequenceNode[] = [];

  for (const seq of sortedSequences) {
    const seqScenes = scenesBySequence.get(seq.id) ?? [];
    const node: StructurePickerSequenceNode = {
      id: seq.id,
      label: sequenceLabel(seq, 0),
      scenes: seqScenes,
    };
    const actId = seq.actId?.trim();
    if (actId) {
      const list = sequencesByAct.get(actId) ?? [];
      list.push(node);
      sequencesByAct.set(actId, list);
    } else {
      orphanSequences.push(node);
    }
  }

  const tree: StructurePickerActNode[] = sortedActs.map((act, i) => ({
    id: act.id,
    label: actLabel(act, i),
    sequences: sequencesByAct.get(act.id) ?? [],
  }));

  if (orphanSequences.length > 0 || orphanScenes.length > 0) {
    tree.push({
      id: "__orphan__",
      label: "Ohne Zuordnung",
      sequences: [
        ...orphanSequences,
        ...(orphanScenes.length > 0
          ? [
              {
                id: "__orphan_scenes__",
                label: "Szenen",
                scenes: orphanScenes,
              },
            ]
          : []),
      ],
    });
  }

  return tree.filter(
    (act) =>
      act.sequences.some((seq) => seq.scenes.length > 0) ||
      act.id === "__orphan__",
  );
}

export function findSceneLabelInTree(
  tree: StructurePickerActNode[],
  sceneId: string,
): string | undefined {
  for (const act of tree) {
    for (const seq of act.sequences) {
      const hit = seq.scenes.find((s) => s.id === sceneId);
      if (hit) return hit.label;
    }
  }
  return undefined;
}

export function isSceneInTree(
  tree: StructurePickerActNode[],
  sceneId: string,
): boolean {
  return findSceneLabelInTree(tree, sceneId) !== undefined;
}
