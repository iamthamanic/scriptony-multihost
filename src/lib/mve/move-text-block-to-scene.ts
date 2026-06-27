/**
 * Move an MVE text block (and bound audio clip) to another scene (T32).
 * Location: src/lib/mve/move-text-block-to-scene.ts
 */

import { updateClip } from "@/lib/api-adapter/clips-adapter";
import { getMveLines, updateMveLine } from "@/lib/api-adapter/mve-adapter";
import { localGetProjectAudioClips } from "@/lib/api-adapter/clips-local";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import { extendSceneForAudio } from "@/lib/structure/extend-scene-for-audio";
import {
  clipTimesAfterSceneMove,
  nextLineOrderIndex,
  sceneBlockForId,
  type SceneTimeBlock,
} from "./resolve-scene-at-timeline-sec";

export interface MoveTextBlockToSceneInput {
  projectId: string;
  lineId: string;
  targetSceneId: string;
  sceneBlocks: SceneTimeBlock[];
}

export interface MoveTextBlockToSceneResult {
  line: MveLine;
  movedClipId?: string;
}

export async function moveTextBlockToScene(
  input: MoveTextBlockToSceneInput,
): Promise<MoveTextBlockToSceneResult> {
  const { projectId, lineId, targetSceneId, sceneBlocks } = input;
  const lines = await getMveLines(projectId);
  const line = lines.find((l) => l.id === lineId);
  if (!line) throw new Error("Textblock nicht gefunden.");
  if (line.sceneId === targetSceneId) {
    return { line };
  }

  const targetBlock = sceneBlockForId(targetSceneId, sceneBlocks);
  if (!targetBlock) {
    throw new Error("Zielszene nicht in der Timeline gefunden.");
  }

  const orderIndex = nextLineOrderIndex(
    lines.filter((l) => l.sceneId === targetSceneId),
  );

  const updatedLine = await updateMveLine(lineId, {
    sceneId: targetSceneId,
    orderIndex,
    status: "dirty",
  });

  let movedClipId: string | undefined;
  if (line.audioClipId) {
    const clips = await localGetProjectAudioClips(projectId);
    const clip = clips.find((c) => c.id === line.audioClipId);
    if (clip) {
      const { startSec, endSec } = clipTimesAfterSceneMove(
        clip.startSec,
        clip.endSec,
        targetBlock,
      );
      await updateClip(clip.id, { sceneId: targetSceneId, startSec, endSec });
      movedClipId = clip.id;
      try {
        await extendSceneForAudio({
          projectId,
          sceneId: targetSceneId,
          clipId: clip.id,
          clipEndSec: endSec,
        });
      } catch (err) {
        console.warn("[moveTextBlockToScene] extend scene failed:", err);
      }
    }
  }

  return { line: updatedLine, movedClipId };
}
