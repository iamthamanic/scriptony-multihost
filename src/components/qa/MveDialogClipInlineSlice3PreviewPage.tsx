/**
 * DEV-only QA harness — MVE dialog clip inline UI for audio-bound clips (Slice 3).
 * Location: src/components/qa/MveDialogClipInlineSlice3PreviewPage.tsx
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AudioTimelineMveDialogSegment } from "@/components/audio/AudioTimelineMveDialogSegment";
import { AudioTimelineMveTextBlock } from "@/components/audio/AudioTimelineMveTextBlock";
import { AudioTimelineSegment } from "@/components/audio/AudioTimelineSegment";
import { GlobalLoadingProgressProvider } from "@/hooks/useGlobalLoadingProgress";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { AudioClip, Character } from "@/lib/types";

const PX_PER_SEC = 20;
const DIALOG_LANE_H = 280;
const NOW = "2026-06-26T12:00:00.000Z";
const PROJECT_ID = "proj_slice3_preview";

const MOCK_CHARACTER: Character = {
  id: "char_preview",
  projectId: PROJECT_ID,
  name: "Anna Keller",
  createdAt: NOW,
  updatedAt: NOW,
};

const BASE_LINE: MveLine = {
  id: "line_audio_bound",
  sceneId: "scene-1",
  orderIndex: 0,
  type: "dialogue",
  status: "ready",
  characterId: MOCK_CHARACTER.id,
  text: "Willkommen in unserer Geschichte.",
  audioClipId: "clip_audio_bound",
  createdAt: NOW,
  updatedAt: NOW,
};

function mockClip(overrides: Partial<AudioClip>): AudioClip {
  return {
    id: "clip_audio_bound",
    trackId: "track-1",
    sceneId: "scene-1",
    projectId: PROJECT_ID,
    startSec: 0,
    endSec: 8,
    laneIndex: 0,
    orderIndex: 0,
    trackType: "dialog",
    content: BASE_LINE.text ?? "",
    audioFileId: "file-1",
    waveformData: [0.15, 0.85, 0.55, 0.3, 0.7],
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
    <section data-testid={testId} className="space-y-2">
      <div
        className="relative overflow-hidden rounded border border-border bg-muted/30"
        style={{ width: `${widthPx}px`, height: `${DIALOG_LANE_H}px` }}
      >
        {children}
      </div>
    </section>
  );
}

export function MveDialogClipInlineSlice3PreviewPage() {
  if (!import.meta.env.DEV) {
    return (
      <p className="p-8 text-sm text-muted-foreground">
        QA-Vorschau nur im Dev-Build verfügbar.
      </p>
    );
  }

  const clipWithWaveform = mockClip({});
  const clipNoWaveform = mockClip({
    id: "clip_no_waveform",
    audioFileId: "file-2",
    waveformData: undefined,
  });
  const clipEstimated = mockClip({
    id: "clip_estimated",
    audioFileId: undefined,
    waveformData: undefined,
  });
  const nonMveDialogClip = mockClip({
    id: "clip_non_mve",
    audioFileId: undefined,
    waveformData: undefined,
  });
  const sfxClip = mockClip({
    id: "clip_sfx",
    trackType: "sfx",
    content: "Door slam",
    laneIndex: 10,
    endSec: 3,
  });

  const segmentProps = {
    pxPerSec: PX_PER_SEC,
    projectId: PROJECT_ID,
    sceneLabel: "Szene 01",
    character: MOCK_CHARACTER,
    onSaveText: noopAsync,
    onSaveDirection: noopAsync,
    onRenderLine: noopAsync,
    onBindAudioClip: noopAsync,
  };

  return (
    <PreviewProviders>
      <div
        className="mx-auto max-w-5xl space-y-10 p-8"
        data-testid="mve-dialog-clip-inline-slice3-preview"
      >
        <header className="space-y-1">
          <h1 className="text-lg font-semibold">
            MVE Dialog Clip Inline — Slice 3 (Audio-bound)
          </h1>
          <p className="text-xs text-muted-foreground">
            verify-ui harness @ {DIALOG_LANE_H}px dialog lane height
          </p>
        </header>

        <LaneShell testId="mve-audio-bound-waveform" widthPx={160}>
          <AudioTimelineMveDialogSegment
            clip={clipWithWaveform}
            line={BASE_LINE}
            isEditable
            onTrimEnd={noopAsync}
            {...segmentProps}
          />
        </LaneShell>

        <LaneShell testId="mve-audio-bound-placeholder" widthPx={160}>
          <AudioTimelineMveDialogSegment
            clip={clipNoWaveform}
            line={{ ...BASE_LINE, id: "line_no_waveform" }}
            {...segmentProps}
          />
        </LaneShell>

        <LaneShell testId="mve-estimated-generate-menu" widthPx={160}>
          <AudioTimelineMveDialogSegment
            clip={clipEstimated}
            line={{
              ...BASE_LINE,
              id: "line_estimated",
              audioClipId: "clip_estimated",
            }}
            scenes={[{ id: "scene-1", name: "Szene 01" }]}
            {...segmentProps}
          />
        </LaneShell>

        <LaneShell testId="mve-text-only-inline" widthPx={160}>
          <AudioTimelineMveTextBlock
            line={{
              ...BASE_LINE,
              id: "line_text_only",
              audioClipId: undefined,
            }}
            pxPerSec={PX_PER_SEC}
            viewStartSec={0}
            startSec={0}
            endSec={8}
            projectId={PROJECT_ID}
            sceneLabel="Szene 01"
            character={MOCK_CHARACTER}
            onSaveText={noopAsync}
            onSaveDirection={noopAsync}
            onBindAudioClip={noopAsync}
          />
        </LaneShell>

        <LaneShell testId="non-mve-dialog-amber" widthPx={120}>
          <AudioTimelineSegment
            item={nonMveDialogClip}
            pxPerSec={PX_PER_SEC}
            isEditable
            onGenerateTts={() => undefined}
          />
        </LaneShell>

        <LaneShell testId="sfx-clip-unchanged" widthPx={80}>
          <AudioTimelineSegment item={sfxClip} pxPerSec={PX_PER_SEC} />
        </LaneShell>
      </div>
    </PreviewProviders>
  );
}
