/**
 * DEV-only QA harness — MVE multi-textblock order + stacking (verify-ui).
 * Location: src/components/qa/MveTextBlockOrderSyncPreviewPage.tsx
 */

import { MveTextBlockLaneItems } from "@/components/timeline/audio/MveTextBlockLaneItems";
import type { MveLineClipHandlers } from "@/components/timeline/audio/AudioClipLaneContent";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { SceneTimeBlock } from "@/lib/mve/resolve-scene-at-timeline-sec";
import { DEFAULT_EMPTY_LINE_SHELL_SEC } from "@/lib/mve/resolve-mve-line-span";

const PX_PER_SEC = 20;
const VIEW_START_SEC = 0;
const SCENE_START = 10;
const SCENE_END = 40;
const SCENE_GROWN_END = SCENE_END + DEFAULT_EMPTY_LINE_SHELL_SEC;

const mveLinesStub: MveLineClipHandlers = {
  projectId: "qa-mve-order-sync",
  projectType: "audio",
  lineByClipId: new Map(),
  onSaveText: async () => undefined,
  onSaveDirection: async () => undefined,
};

function mockLine(id: string, text: string, orderIndex: number): MveLine {
  return {
    id,
    sceneId: "scene-1",
    characterId: "char-1",
    orderIndex,
    type: "dialogue",
    status: "draft",
    text,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function SceneShellBar({
  sceneBlock,
  label,
}: {
  sceneBlock: SceneTimeBlock;
  label: string;
}) {
  const widthPx = (sceneBlock.endSec - sceneBlock.startSec) * PX_PER_SEC;
  const leftPx = (sceneBlock.startSec - VIEW_START_SEC) * PX_PER_SEC;
  return (
    <div
      className="relative mb-1 h-3"
      style={{ width: `${sceneBlock.endSec * PX_PER_SEC + 80}px` }}
    >
      <div
        data-testid="scene-shell-bar"
        data-scene-end-sec={sceneBlock.endSec}
        className="absolute top-0 h-full rounded bg-fuchsia-500/40 border border-fuchsia-400"
        style={{
          left: `${leftPx}px`,
          width: `${widthPx}px`,
        }}
        title={label}
      />
    </div>
  );
}

function LanePreview({
  testId,
  lines,
  sceneBlock,
  sceneLabel,
}: {
  testId: string;
  lines: MveLine[];
  sceneBlock: SceneTimeBlock;
  sceneLabel: string;
}) {
  const totalWidthPx = sceneBlock.endSec * PX_PER_SEC + 200;
  return (
    <section data-testid={testId} className="space-y-2">
      <h2 className="text-xs font-medium text-muted-foreground">
        {sceneLabel}
      </h2>
      <SceneShellBar sceneBlock={sceneBlock} label={sceneLabel} />
      <div
        className="relative h-14 rounded border border-border bg-muted/20"
        style={{ width: `${totalWidthPx}px` }}
      >
        <MveTextBlockLaneItems
          lines={lines}
          pxPerSec={PX_PER_SEC}
          viewStartSec={VIEW_START_SEC}
          sceneBlocks={[sceneBlock]}
          characterId="char-1"
          sceneOptions={[{ id: "scene-1", name: "Scene 1" }]}
          mveLines={mveLinesStub}
        />
      </div>
    </section>
  );
}

export function MveTextBlockOrderSyncPreviewPage() {
  if (!import.meta.env.DEV) {
    return (
      <p className="p-8 text-sm text-muted-foreground">
        QA-Vorschau nur im Dev-Build verfügbar.
      </p>
    );
  }

  const baseScene: SceneTimeBlock = {
    id: "scene-1",
    startSec: SCENE_START,
    endSec: SCENE_END,
  };
  const grownScene: SceneTimeBlock = {
    id: "scene-1",
    startSec: SCENE_START,
    endSec: SCENE_GROWN_END,
  };
  const tenWords = "one two three four five six seven eight nine ten";

  return (
    <div
      className="mx-auto max-w-4xl space-y-8 p-8"
      data-testid="mve-textblock-order-sync-preview"
    >
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">
          MVE Textblock Order + Scene Sync — QA
        </h1>
        <p className="text-xs text-muted-foreground">
          orderIndex 0/1 stacking @ {PX_PER_SEC}px/s
        </p>
      </header>

      <LanePreview
        testId="stack-two-correct-order"
        sceneBlock={baseScene}
        sceneLabel="Zwei leere Blöcke (orderIndex 0, 1)"
        lines={[mockLine("line-a", "", 0), mockLine("line-b", "", 1)]}
      />

      <LanePreview
        testId="stack-text-then-empty"
        sceneBlock={baseScene}
        sceneLabel="Text in Block 1 + leerer Block 2"
        lines={[
          mockLine("line-text", tenWords, 0),
          mockLine("line-empty", "", 1),
        ]}
      />

      <LanePreview
        testId="scene-grown-shell"
        sceneBlock={grownScene}
        sceneLabel="Szene gewachsen (+5s Shell für Block 2)"
        lines={[mockLine("line-a", "", 0), mockLine("line-b", "", 1)]}
      />
    </div>
  );
}
