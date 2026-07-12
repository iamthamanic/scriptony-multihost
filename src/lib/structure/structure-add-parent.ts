/**
 * structure-add-parent — Parent-Auswahl für Timeline „+“ (Act/Sequence/Scene).
 * Location: src/lib/structure/structure-add-parent.ts
 */

import type { Act, Scene, Sequence } from "../types";

export type StructureAddKind = "act" | "sequence" | "scene" | "shot";

export interface StructureParentOption {
  id: string;
  label: string;
}

export interface StructureAddLabels {
  act: string;
  sequence: string;
  scene: string;
  shot?: string;
}

export interface StructureTimelineRefs {
  acts?: Act[];
  sequences?: Sequence[];
  scenes?: Scene[];
}

/** Act: sofort anlegen. Sequence/Scene: Parent-Dialog (immer, auch bei nur einer Option). */
export function structureAddRequiresParentPicker(
  kind: StructureAddKind,
): boolean {
  return kind === "sequence" || kind === "scene" || kind === "shot";
}

export function structureAddPrerequisiteKind(
  kind: StructureAddKind,
): StructureAddKind | null {
  if (kind === "sequence") return "act";
  if (kind === "scene") return "sequence";
  if (kind === "shot") return "scene";
  return null;
}

export function buildStructureParentOptions(
  kind: StructureAddKind,
  data: StructureTimelineRefs,
  labels: StructureAddLabels,
): StructureParentOption[] {
  if (kind === "sequence") {
    return (data.acts ?? []).map((act) => ({
      id: act.id,
      label: act.title?.trim() || labels.act,
    }));
  }

  if (kind === "scene") {
    const actById = new Map((data.acts ?? []).map((a) => [a.id, a]));
    return (data.sequences ?? []).map((seq) => {
      const act = actById.get(seq.actId);
      const actLabel = act?.title?.trim() || labels.act;
      const seqLabel = seq.title?.trim() || labels.sequence;
      return {
        id: seq.id,
        label: `${actLabel} › ${seqLabel}`,
      };
    });
  }

  if (kind === "shot") {
    const actById = new Map((data.acts ?? []).map((a) => [a.id, a]));
    const seqById = new Map((data.sequences ?? []).map((s) => [s.id, s]));
    return (data.scenes ?? []).map((scene) => {
      const seq = scene.sequenceId ? seqById.get(scene.sequenceId) : undefined;
      const act = seq ? actById.get(seq.actId) : undefined;
      const actLabel = act?.title?.trim() || labels.act;
      const seqLabel = seq?.title?.trim() || labels.sequence;
      const sceneLabel = scene.title?.trim() || labels.scene;
      return {
        id: scene.id,
        label: `${actLabel} › ${seqLabel} › ${sceneLabel}`,
      };
    });
  }

  return [];
}

export function structureAddDialogParentLabel(
  kind: StructureAddKind,
  labels: StructureAddLabels,
): string {
  if (kind === "sequence") return `${labels.act} auswählen`;
  if (kind === "scene") {
    return `${labels.act} und ${labels.sequence} auswählen`;
  }
  if (kind === "shot") {
    return `${labels.act}, ${labels.sequence} und ${labels.scene} auswählen`;
  }
  return `${labels.scene} auswählen`;
}

export function structureAddMissingPrerequisiteMessage(
  kind: StructureAddKind,
  labels: StructureAddLabels,
): string {
  const prereq = structureAddPrerequisiteKind(kind);
  if (!prereq) return "Struktur unvollständig";
  const label =
    prereq === "act"
      ? labels.act
      : prereq === "sequence"
        ? labels.sequence
        : labels.scene;
  return `Bitte zuerst ${label} anlegen`;
}
