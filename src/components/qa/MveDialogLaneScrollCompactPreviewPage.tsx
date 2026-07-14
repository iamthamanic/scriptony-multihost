/**
 * DEV-only QA harness — MVE dialog lane scroll + compact height (Stufe 1).
 * Location: src/components/qa/MveDialogLaneScrollCompactPreviewPage.tsx
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AudioTimelineMveTextBlock } from "@/components/audio/AudioTimelineMveTextBlock";
import { GlobalLoadingProgressProvider } from "@/hooks/useGlobalLoadingProgress";
import { LANE_UI } from "@/lib/audio-lane";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { Character } from "@/lib/types";

const PX_PER_SEC = 20;
const NOW = "2026-07-12T12:00:00.000Z";
const PROJECT_ID = "proj_scroll_compact_preview";

const LONG_TEXT = Array.from(
  { length: 18 },
  (_, i) => `Zeile ${i + 1}: Test oder so keine ahnung bruder.`,
).join("\n");

const MOCK_CHARACTER: Character = {
  id: "char_scroll",
  projectId: PROJECT_ID,
  name: "Pazulu",
  createdAt: NOW,
  updatedAt: NOW,
};

function makeLine(text: string, id: string): MveLine {
  return {
    id,
    sceneId: "scene-1",
    orderIndex: 0,
    type: "dialogue",
    status: "draft",
    characterId: MOCK_CHARACTER.id,
    text,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

const noopAsync = async () => undefined;

function PreviewProviders({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalLoadingProgressProvider>{children}</GlobalLoadingProgressProvider>
    </QueryClientProvider>
  );
}

function LaneShell({
  testId,
  heightPx,
  widthPx,
  children,
}: {
  testId: string;
  heightPx: number;
  widthPx: number;
  children: ReactNode;
}) {
  return (
    <section data-testid={testId} className="space-y-1">
      <p
        className="text-xs text-muted-foreground"
        data-testid={`${testId}-height-label`}
      >
        Lane {heightPx}px
      </p>
      <div
        className="relative overflow-hidden rounded border border-border bg-muted/30"
        style={{ width: `${widthPx}px`, height: `${heightPx}px` }}
        data-testid={`${testId}-shell`}
      >
        {children}
      </div>
    </section>
  );
}

export function MveDialogLaneScrollCompactPreviewPage() {
  if (!import.meta.env.DEV) {
    return (
      <p className="p-8 text-sm text-muted-foreground">
        QA-Vorschau nur im Dev-Build verfügbar.
      </p>
    );
  }

  const blockProps = {
    pxPerSec: PX_PER_SEC,
    viewStartSec: 0,
    startSec: 0,
    endSec: 12,
    projectId: PROJECT_ID,
    sceneLabel: "Szene 1: Scene 3",
    character: MOCK_CHARACTER,
    onSaveText: noopAsync,
    onSaveDirection: noopAsync,
    onBindAudioClip: noopAsync,
  };

  return (
    <PreviewProviders>
      <div
        className="mx-auto max-w-5xl space-y-10 p-8"
        data-testid="mve-dialog-lane-scroll-compact-preview"
      >
        <header className="space-y-1">
          <h1 className="text-lg font-semibold">
            MVE Dialog Lane — Scroll + Compact Height
          </h1>
          <p className="text-xs text-muted-foreground">
            verify-ui @ {LANE_UI.heightDialogCompact}px compact /{" "}
            {LANE_UI.heightDialogEmpty}px empty
          </p>
        </header>

        <LaneShell
          testId="scroll-compact-short"
          heightPx={LANE_UI.heightDialogCompact}
          widthPx={320}
        >
          <AudioTimelineMveTextBlock
            line={makeLine("Kurzer Dialog.", "line_short")}
            {...blockProps}
          />
        </LaneShell>

        <LaneShell
          testId="scroll-compact-long"
          heightPx={LANE_UI.heightDialogCompact}
          widthPx={320}
        >
          <AudioTimelineMveTextBlock
            line={makeLine(LONG_TEXT, "line_long")}
            {...blockProps}
          />
        </LaneShell>

        <LaneShell
          testId="scroll-empty-lane"
          heightPx={LANE_UI.heightDialogEmpty}
          widthPx={320}
        >
          <div
            className="flex h-full items-center justify-center text-[10px] text-muted-foreground"
            data-testid="empty-lane-placeholder"
          >
            Kein Textblock (leere Dialog-Spur)
          </div>
        </LaneShell>
      </div>
    </PreviewProviders>
  );
}
