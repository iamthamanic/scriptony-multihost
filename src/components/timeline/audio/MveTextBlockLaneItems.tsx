/**
 * Renders draggable MVE text blocks inside an audio lane row (T32).
 * Location: src/components/timeline/audio/MveTextBlockLaneItems.tsx
 */

import { AudioTimelineMveTextBlock } from "../../audio/AudioTimelineMveTextBlock";
import type { SceneTimeBlock } from "@/lib/mve/resolve-scene-at-timeline-sec";
import { textBlockTimingForLine } from "@/hooks/useMveTextBlockLaneDrop";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { MveSceneOption } from "@/hooks/useMveTextBlockAudio";
import type { MveLineClipHandlers } from "./AudioClipLaneContent";

export interface MveTextBlockLaneItemsProps {
  lines: MveLine[];
  pxPerSec: number;
  viewStartSec: number;
  sceneBlocks: SceneTimeBlock[];
  characterId?: string;
  sceneOptions: MveSceneOption[];
  mveLines?: MveLineClipHandlers;
  draggable?: boolean;
}

export function MveTextBlockLaneItems({
  lines,
  pxPerSec,
  viewStartSec,
  sceneBlocks,
  characterId,
  sceneOptions,
  mveLines,
  draggable,
}: MveTextBlockLaneItemsProps) {
  return (
    <>
      {lines.map((line) => {
        const { startSec, endSec } = textBlockTimingForLine(
          line.sceneId,
          sceneBlocks,
        );
        return (
          <AudioTimelineMveTextBlock
            key={`text-block-${line.id}`}
            line={line}
            pxPerSec={pxPerSec}
            viewStartSec={viewStartSec}
            sceneStartSec={startSec}
            sceneEndSec={endSec}
            projectId={mveLines?.projectId}
            sceneId={line.sceneId}
            characterId={characterId}
            scenes={sceneOptions}
            onSaveText={mveLines?.onSaveText}
            onBindAudioClip={mveLines?.onBindAudioClip}
            draggable={draggable}
          />
        );
      })}
    </>
  );
}
