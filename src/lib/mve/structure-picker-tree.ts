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

export interface StructurePickerDiagnostic {
  code:
    | "scene_missing_parent"
    | "scene_parent_is_act"
    | "sequence_missing_act"
    | "act_without_sequences"
    | "sequence_without_scenes";
  message: string;
  nodeId?: string;
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

const DIRECT_SCENES_SUFFIX = "__direct_scenes";

/** Dev/support: explain why acts or scenes may be missing from the picker tree. */
export function diagnoseStructurePicker(
  acts: Act[],
  sequences: Sequence[],
  scenes: Scene[],
): StructurePickerDiagnostic[] {
  const actIds = new Set(acts.map((a) => a.id));
  const sequenceIds = new Set(sequences.map((s) => s.id));
  const diagnostics: StructurePickerDiagnostic[] = [];

  for (const scene of scenes) {
    const parentId = scene.sequenceId?.trim();
    if (!parentId) {
      diagnostics.push({
        code: "scene_missing_parent",
        message: `Szene „${sceneLabel(scene)}“ hat keine Sequenz-Zuordnung (parent_id leer).`,
        nodeId: scene.id,
      });
      continue;
    }
    if (actIds.has(parentId) && !sequenceIds.has(parentId)) {
      diagnostics.push({
        code: "scene_parent_is_act",
        message: `Szene „${sceneLabel(scene)}“ hängt direkt unter einem Akt statt unter einer Sequenz — wird unter „Szenen (direkt unter Akt)“ angezeigt.`,
        nodeId: scene.id,
      });
    } else if (!sequenceIds.has(parentId) && !actIds.has(parentId)) {
      diagnostics.push({
        code: "scene_missing_parent",
        message: `Szene „${sceneLabel(scene)}“ verweist auf unbekannten Parent „${parentId}“.`,
        nodeId: scene.id,
      });
    }
  }

  for (const seq of sequences) {
    if (!seq.actId?.trim() || !actIds.has(seq.actId)) {
      diagnostics.push({
        code: "sequence_missing_act",
        message: `Sequenz „${sequenceLabel(seq, 0)}“ hat keinen gültigen Akt-Parent.`,
        nodeId: seq.id,
      });
    }
    const hasScenes = scenes.some((s) => s.sequenceId?.trim() === seq.id);
    if (!hasScenes) {
      diagnostics.push({
        code: "sequence_without_scenes",
        message: `Sequenz „${sequenceLabel(seq, 0)}“ enthält noch keine Szenen — im Picker sichtbar, aber ohne Auswahl.`,
        nodeId: seq.id,
      });
    }
  }

  for (const act of acts) {
    const actSequences = sequences.filter((s) => s.actId === act.id);
    if (actSequences.length === 0) {
      diagnostics.push({
        code: "act_without_sequences",
        message: `Akt „${actLabel(act, 0)}“ hat noch keine Sequenzen.`,
        nodeId: act.id,
      });
    }
  }

  return diagnostics;
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

  const actIds = new Set(sortedActs.map((a) => a.id));
  const sequenceIds = new Set(sortedSequences.map((s) => s.id));
  const scenesBySequence = new Map<string, StructurePickerSceneNode[]>();
  const scenesByActDirect = new Map<string, StructurePickerSceneNode[]>();
  const orphanScenes: StructurePickerSceneNode[] = [];

  for (const scene of sortedScenes) {
    const node: StructurePickerSceneNode = {
      id: scene.id,
      label: sceneLabel(scene),
    };
    const parentId = scene.sequenceId?.trim();
    if (!parentId) {
      orphanScenes.push(node);
      continue;
    }
    if (sequenceIds.has(parentId)) {
      const list = scenesBySequence.get(parentId) ?? [];
      list.push(node);
      scenesBySequence.set(parentId, list);
    } else if (actIds.has(parentId)) {
      const list = scenesByActDirect.get(parentId) ?? [];
      list.push(node);
      scenesByActDirect.set(parentId, list);
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
    if (actId && actIds.has(actId)) {
      const list = sequencesByAct.get(actId) ?? [];
      list.push(node);
      sequencesByAct.set(actId, list);
    } else {
      orphanSequences.push(node);
    }
  }

  const tree: StructurePickerActNode[] = sortedActs.map((act, i) => {
    const actSequences = [...(sequencesByAct.get(act.id) ?? [])];
    const directScenes = scenesByActDirect.get(act.id) ?? [];
    if (directScenes.length > 0) {
      actSequences.push({
        id: `${act.id}${DIRECT_SCENES_SUFFIX}`,
        label: "Szenen (direkt unter Akt)",
        scenes: directScenes,
      });
    }
    return {
      id: act.id,
      label: actLabel(act, i),
      sequences: actSequences,
    };
  });

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

  return tree;
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

export function countSelectableScenesInTree(
  tree: StructurePickerActNode[],
): number {
  let count = 0;
  for (const act of tree) {
    for (const seq of act.sequences) {
      count += seq.scenes.length;
    }
  }
  return count;
}
