/**
 * DEV-only QA harness — empty MVE text block shell widths on timeline.
 * Location: src/components/qa/MveEmptyTextBlockShellPreviewPage.tsx
 */

import { MveTextBlockLaneItems } from "@/components/timeline/audio/MveTextBlockLaneItems";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { SceneTimeBlock } from "@/lib/mve/resolve-scene-at-timeline-sec";
import { DEFAULT_EMPTY_LINE_SHELL_SEC } from "@/lib/mve/resolve-mve-line-span";

const PX_PER_SEC = 20;
const VIEW_START_SEC = 0;
const SCENE_START = 10;
const SCENE_END = 40;
const SCENE_DURATION_SEC = SCENE_END - SCENE_START;

const sceneBlock: SceneTimeBlock = {
  id: "scene-1",
  startSec: SCENE_START,
  endSec: SCENE_END,
};

function mockLine(id: string, text: string, orderIndex: number): MveLine {
  return {
    id,
    sceneId: "scene-1",
    orderIndex,
    type: "dialogue",
    status: "draft",
    text,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function LanePreview({ testId, lines }: { testId: string; lines: MveLine[] }) {
  const totalWidthPx = SCENE_END * PX_PER_SEC + 200;
  return (
    <section data-testid={testId} className="space-y-2">
      <div
        className="relative h-12 rounded border border-border bg-muted/20"
        style={{ width: `${totalWidthPx}px` }}
        data-expected-shell-sec={SCENE_DURATION_SEC}
        data-expected-shell-px={SCENE_DURATION_SEC * PX_PER_SEC}
        data-expected-additional-shell-sec={DEFAULT_EMPTY_LINE_SHELL_SEC}
        data-expected-additional-shell-px={
          DEFAULT_EMPTY_LINE_SHELL_SEC * PX_PER_SEC
        }
      >
        <MveTextBlockLaneItems
          lines={lines}
          pxPerSec={PX_PER_SEC}
          viewStartSec={VIEW_START_SEC}
          sceneBlocks={[sceneBlock]}
          sceneOptions={[{ id: "scene-1", name: "Scene 1" }]}
        />
      </div>
    </section>
  );
}

export function MveEmptyTextBlockShellPreviewPage() {
  if (!import.meta.env.DEV) {
    return (
      <p className="p-8 text-sm text-muted-foreground">
        QA-Vorschau nur im Dev-Build verfügbar.
      </p>
    );
  }

  const tenWords = "one two three four five six seven eight nine ten";

  return (
    <div
      className="mx-auto max-w-4xl space-y-8 p-8"
      data-testid="mve-empty-text-block-shell-preview"
    >
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">
          Empty Text Block Shell — Timeline Width
        </h1>
        <p className="text-xs text-muted-foreground">
          Scene {SCENE_START}s–{SCENE_END}s @ {PX_PER_SEC}px/s
        </p>
      </header>

      <LanePreview
        testId="shell-first-empty"
        lines={[mockLine("line-first-empty", "", 0)]}
      />

      <LanePreview
        testId="shell-two-empty"
        lines={[mockLine("line-a", "", 0), mockLine("line-b", "", 1)]}
      />

      <LanePreview
        testId="shell-with-wpm-text"
        lines={[mockLine("line-wpm", tenWords, 0)]}
      />
    </div>
  );
}
