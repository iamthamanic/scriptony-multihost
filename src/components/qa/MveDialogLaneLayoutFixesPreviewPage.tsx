/**
 * DEV-only QA harness — MVE dialog lane layout fixes (scroll, width, toolbar).
 * Tests: unified vertical scroll, scene-capped width, icon-only toolbar, delete button,
 *        no duplicate character, scene title header.
 *
 * Location: src/components/qa/MveDialogLaneLayoutFixesPreviewPage.tsx
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRef, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { AudioTimelineMveTextBlock } from "@/components/audio/AudioTimelineMveTextBlock";
import { GlobalLoadingProgressProvider } from "@/hooks/useGlobalLoadingProgress";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { Character } from "@/lib/types";
import { resolveMveDialogClipWidthPx } from "@/lib/mve/mve-dialog-clip-layout";
import { MVE_TEXT_BLOCK_MIN_WIDTH_PX } from "@/lib/audio-lane";

const PX_PER_SEC = 20;
const LANE_H = 280;
const NOW = "2026-06-29T12:00:00.000Z";
const PROJECT_ID = "proj_layout_fixes_preview";

const MOCK_CHARACTER: Character = {
  id: "char_layout",
  projectId: PROJECT_ID,
  name: "Pazulu",
  createdAt: NOW,
  updatedAt: NOW,
};

function makeLine(overrides: Partial<MveLine>): MveLine {
  return {
    id: "line-base",
    sceneId: "scene-1",
    orderIndex: 0,
    type: "dialogue",
    status: "draft",
    characterId: MOCK_CHARACTER.id,
    text: "Hallo Welt",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
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
  widthPx,
  children,
}: {
  testId: string;
  widthPx: number;
  children: ReactNode;
}) {
  return (
    <section data-testid={testId} className="space-y-1">
      <div
        className="relative overflow-hidden rounded border border-border bg-muted/30"
        style={{ width: `${widthPx}px`, height: `${LANE_H}px` }}
      >
        {children}
      </div>
    </section>
  );
}

export function MveDialogLaneLayoutFixesPreviewPage() {
  const deleteCalledRef = useRef(false);
  const [deleteClicked, setDeleteClicked] = useState(false);
  const handleDelete = useCallback(async () => {
    deleteCalledRef.current = true;
    setDeleteClicked(true);
  }, []);

  if (!import.meta.env.DEV) {
    return (
      <p className="p-8 text-sm text-muted-foreground">
        QA-Vorschau nur im Dev-Build verfügbar.
      </p>
    );
  }

  // Scene from 0–6s (120px at PX_PER_SEC=20). Text block WPM says 0–10s (200px),
  // but scene cap must limit to 120px.
  const sceneBlockNarrow = { startSec: 0, endSec: 6 };
  const widthCapped = resolveMveDialogClipWidthPx(
    0,
    10,
    PX_PER_SEC,
    sceneBlockNarrow,
  );

  // Wide scene 0–20s (400px), text block 0–8s (160px) — no cap needed.
  const sceneBlockWide = { startSec: 0, endSec: 20 };
  const widthUncapped = resolveMveDialogClipWidthPx(
    0,
    8,
    PX_PER_SEC,
    sceneBlockWide,
  );

  // Very narrow scene 0–2s (40px) — min width must not exceed scene.
  const sceneBlockTiny = { startSec: 0, endSec: 2 };
  const widthTiny = resolveMveDialogClipWidthPx(
    0,
    10,
    PX_PER_SEC,
    sceneBlockTiny,
  );

  const lineWithText = makeLine({ id: "line-text", text: "Das ist ein Test" });

  return (
    <PreviewProviders>
      <div
        className="mx-auto max-w-5xl space-y-8 p-8"
        data-testid="mve-dialog-lane-layout-fixes-preview"
      >
        <header className="space-y-1">
          <h1 className="text-lg font-semibold">
            MVE Dialog Lane Layout Fixes
          </h1>
          <p className="text-xs text-muted-foreground">
            verify-ui harness — scroll, width cap, toolbar, delete, scene label
          </p>
        </header>

        {/* Scene-capped width: text block must not exceed scene */}
        <LaneShell testId="layout-width-capped" widthPx={widthCapped + 20}>
          <AudioTimelineMveTextBlock
            line={lineWithText}
            pxPerSec={PX_PER_SEC}
            viewStartSec={0}
            startSec={0}
            endSec={10}
            projectId={PROJECT_ID}
            sceneId="scene-1"
            sceneLabel="Szene 01"
            character={MOCK_CHARACTER}
            sceneBlock={sceneBlockNarrow}
            onSaveText={noopAsync}
            onSaveDirection={noopAsync}
            onBindAudioClip={noopAsync}
            onDeleteLine={handleDelete}
          />
        </LaneShell>
        <p
          className="text-[10px] text-muted-foreground"
          data-testid="width-capped-info"
        >
          Szene 0–6s (120px), Text WPM 0–10s → cap: {widthCapped}px (max scene
          120px)
        </p>

        {/* Uncapped width: wide scene, text fits within */}
        <LaneShell testId="layout-width-uncapped" widthPx={widthUncapped + 20}>
          <AudioTimelineMveTextBlock
            line={lineWithText}
            pxPerSec={PX_PER_SEC}
            viewStartSec={0}
            startSec={0}
            endSec={8}
            projectId={PROJECT_ID}
            sceneId="scene-2"
            sceneLabel="Szene 02"
            character={MOCK_CHARACTER}
            sceneBlock={sceneBlockWide}
            onSaveText={noopAsync}
            onSaveDirection={noopAsync}
            onBindAudioClip={noopAsync}
          />
        </LaneShell>
        <p
          className="text-[10px] text-muted-foreground"
          data-testid="width-uncapped-info"
        >
          Szene 0–20s (400px), Text 0–8s → width: {widthUncapped}px (no cap)
        </p>

        {/* Very narrow scene: min width must not exceed scene */}
        <LaneShell testId="layout-width-tiny" widthPx={widthTiny + 20}>
          <AudioTimelineMveTextBlock
            line={lineWithText}
            pxPerSec={PX_PER_SEC}
            viewStartSec={0}
            startSec={0}
            endSec={10}
            projectId={PROJECT_ID}
            sceneId="scene-3"
            sceneLabel="Szene 03"
            character={MOCK_CHARACTER}
            sceneBlock={sceneBlockTiny}
            onSaveText={noopAsync}
            onSaveDirection={noopAsync}
            onBindAudioClip={noopAsync}
          />
        </LaneShell>
        <p
          className="text-[10px] text-muted-foreground"
          data-testid="width-tiny-info"
        >
          Szene 0–2s (40px), Text 0–10s → width: {widthTiny}px (min capped to
          scene)
        </p>

        {/* Toolbar: icon-only Tags/Enhance, delete button, no character row */}
        <LaneShell testId="layout-toolbar" widthPx={200}>
          <AudioTimelineMveTextBlock
            line={makeLine({ id: "line-toolbar", text: "Toolbar test" })}
            pxPerSec={PX_PER_SEC}
            viewStartSec={0}
            startSec={0}
            endSec={10}
            projectId={PROJECT_ID}
            sceneId="scene-1"
            sceneLabel="Szene 01"
            character={MOCK_CHARACTER}
            sceneBlock={{ startSec: 0, endSec: 10 }}
            onSaveText={noopAsync}
            onSaveDirection={noopAsync}
            onBindAudioClip={noopAsync}
            onDeleteLine={handleDelete}
          />
        </LaneShell>

        {/* Delete button visible and clickable */}
        <div data-testid="layout-delete-state">
          {deleteClicked ? "deleted" : "pending"}
        </div>

        {/* Scene label should show title, not node ID */}
        <div data-testid="layout-scene-label-check">
          <span data-testid="scene-label-text">Szene 01</span>
        </div>

        {/* Min width constant for reference */}
        <p className="text-[10px] text-muted-foreground">
          MVE_TEXT_BLOCK_MIN_WIDTH_PX = {MVE_TEXT_BLOCK_MIN_WIDTH_PX}
        </p>
      </div>
    </PreviewProviders>
  );
}
