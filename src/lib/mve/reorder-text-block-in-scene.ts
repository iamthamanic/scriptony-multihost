/**
 * Reorder an MVE text block within its own scene (in-scene horizontal DnD, T32 follow-up).
 * Location: src/lib/mve/reorder-text-block-in-scene.ts
 */

import { getMveLines, updateMveLine } from "@/lib/api-adapter/mve-adapter";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import { reorderLineOrderIndexes } from "./resolve-scene-at-timeline-sec";
import { sortLinesInScene } from "./resolve-mve-line-span";

export interface ReorderTextBlockInSceneInput {
  projectId: string;
  lineId: string;
  sceneId: string;
  /** 0-based target position among scene+character siblings (after removing dragged line). */
  targetIndex: number;
}

export interface ReorderTextBlockInSceneResult {
  reordered: boolean;
  line: MveLine;
}

export async function reorderTextBlockInScene(
  input: ReorderTextBlockInSceneInput,
): Promise<ReorderTextBlockInSceneResult> {
  const { projectId, lineId, sceneId, targetIndex } = input;
  const lines = await getMveLines(projectId);
  const line = lines.find((l) => l.id === lineId);
  if (!line) throw new Error("Textblock nicht gefunden.");
  if (line.sceneId !== sceneId) {
    throw new Error("Textblock gehört nicht zu dieser Szene.");
  }

  const siblings = sortLinesInScene(
    lines.filter(
      (l) =>
        l.sceneId === sceneId &&
        !l.audioClipId &&
        l.characterId === line.characterId,
    ),
  );
  const next = reorderLineOrderIndexes(siblings, lineId, targetIndex);
  const changed = next.filter((entry) => {
    const original = siblings.find((s) => s.id === entry.id);
    return (original?.orderIndex ?? 0) !== entry.orderIndex;
  });

  if (changed.length === 0) {
    return { reordered: false, line };
  }

  const updatedLines = await Promise.all(
    changed.map((entry) =>
      updateMveLine(entry.id, {
        orderIndex: entry.orderIndex,
        status: "dirty",
      }),
    ),
  );

  const updatedDraggedLine = updatedLines.find((l) => l.id === lineId) ?? line;
  return { reordered: true, line: updatedDraggedLine };
}
