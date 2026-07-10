/**
 * Renders draggable MVE text blocks inside an audio lane row (T32).
 * Location: src/components/timeline/audio/MveTextBlockLaneItems.tsx
 */

import { AudioTimelineMveTextBlock } from "../../audio/AudioTimelineMveTextBlock";
import type { SceneTimeBlock } from "@/lib/mve/resolve-scene-at-timeline-sec";
import { resolveMveLineVisualSpanMap } from "@/lib/mve/mve-dialog-clip-layout";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { MveSceneOption } from "@/hooks/useMveTextBlockAudio";
import type { MveLineClipHandlers } from "./AudioClipLaneContent";
import type { Character } from "../../../lib/types";

export interface MveTextBlockLaneItemsProps {
  lines: MveLine[];
  pxPerSec: number;
  viewStartSec: number;
  sceneBlocks: SceneTimeBlock[];
  characterId?: string;
  character?: Character;
  sceneOptions: MveSceneOption[];
  readingSpeedWpm?: number;
  mveLines?: MveLineClipHandlers;
  draggable?: boolean;
}

function sceneLabelForLine(
  line: MveLine,
  sceneOptions: MveSceneOption[],
): string | undefined {
  return sceneOptions.find((s) => s.id === line.sceneId)?.name;
}

export function MveTextBlockLaneItems({
  lines,
  pxPerSec,
  viewStartSec,
  sceneBlocks,
  characterId,
  character,
  sceneOptions,
  readingSpeedWpm,
  mveLines,
  draggable,
}: MveTextBlockLaneItemsProps) {
  const visualSpans = resolveMveLineVisualSpanMap(
    lines,
    sceneBlocks,
    pxPerSec,
    readingSpeedWpm,
  );

  return (
    <>
      {lines.map((line) => {
        const span = visualSpans.get(line.id);
        if (!span) return null;
        const sceneBlock = sceneBlocks.find((b) => b.id === line.sceneId);
        const sceneLabel =
          mveLines?.getSceneLabel?.(line.sceneId) ??
          sceneLabelForLine(line, sceneOptions);
        return (
          <AudioTimelineMveTextBlock
            key={`text-block-${line.id}`}
            line={line}
            pxPerSec={pxPerSec}
            viewStartSec={viewStartSec}
            startSec={span.startSec}
            endSec={span.endSec}
            projectId={mveLines?.projectId}
            projectType={mveLines?.projectType}
            sceneId={line.sceneId}
            sceneLabel={sceneLabel}
            character={character}
            scenes={sceneOptions}
            structurePicker={mveLines?.structurePicker}
            onSaveText={mveLines?.onSaveText}
            onSaveDirection={mveLines?.onSaveDirection}
            onBindAudioClip={mveLines?.onBindAudioClip}
            onDeleteLine={mveLines?.onDeleteLine}
            sceneBlock={
              sceneBlock
                ? { startSec: sceneBlock.startSec, endSec: sceneBlock.endSec }
                : undefined
            }
            draggable={draggable}
          />
        );
      })}
    </>
  );
}
