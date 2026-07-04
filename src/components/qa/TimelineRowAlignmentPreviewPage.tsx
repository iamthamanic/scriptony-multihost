/**
 * DEV-only QA harness — Structure Timeline row alignment (labels vs lanes).
 * Location: src/components/qa/TimelineRowAlignmentPreviewPage.tsx
 */

import { useMemo, useRef, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAudioLaneState } from "@/hooks/useAudioLaneState";
import {
  StructureTimelineAudioLaneLabels,
  StructureTimelineAudioLaneScrollRows,
} from "@/components/structure/timeline/tracks/StructureTimelineAudioLanes";
import { DEFAULT_METRONOME_CONFIG } from "@/lib/audio/metronome-config";
import type { useStructureTimelineAudioLanes } from "@/components/structure/timeline/tracks/StructureTimelineAudioLanes";
import type { Character } from "@/lib/types";

const LANE_INDEX = 0;
const BEAT_H = 40;
const ACT_H = 40;
const FILM_CLIP_H = 32;
const TOTAL_WIDTH = 800;
const PX_PER_SEC = 20;
const NOW = "2026-07-04T12:00:00.000Z";

const MOCK_CHARACTER: Character = {
  id: "char_align",
  projectId: "proj_align",
  name: "AlignTest",
  createdAt: NOW,
  updatedAt: NOW,
};

async function noopAsync() {
  return undefined;
}

function PreviewShell({ children }: { children: ReactNode }) {
  const queryClient = useMemo(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    [],
  );
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export function TimelineRowAlignmentPreviewPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const laneState = useAudioLaneState();

  const laneProps = useMemo(
    () =>
      ({
        pxPerSec: PX_PER_SEC,
        viewStartSec: 0,
        totalWidthPx: TOTAL_WIDTH,
        scenes: [],
        sceneBlocks: [],
        laneGroups: { [LANE_INDEX]: [] },
        sortedLaneIndices: [LANE_INDEX],
        allClips: [],
        laneState,
        handlers: {
          handleTrimEnd: () => undefined,
          handleLaneChange: () => undefined,
          handleDeleteLane: noopAsync,
          handleFxSlotChange: () => undefined,
          handleFxChainEnabledChange: () => undefined,
          handleGenerateTts: () => undefined,
        },
        currentTimeSec: 0,
        expandedLane: null,
        characterLanes: {
          getCharacterForLane: (idx: number) =>
            idx === LANE_INDEX ? MOCK_CHARACTER : undefined,
          characterIdForLane: (idx: number) =>
            idx === LANE_INDEX ? MOCK_CHARACTER.id : undefined,
          dialogLaneOrder: [MOCK_CHARACTER.id],
          reorderCharacters: noopAsync,
          isReordering: false,
          allClips: [],
        },
      }) as unknown as ReturnType<
        typeof useStructureTimelineAudioLanes
      >["laneProps"],
    [laneState],
  );

  const addAudio = useMemo(
    () =>
      ({
        fileInputRef,
        onFileInputChange: () => undefined,
        isBusy: false,
        addSfxLane: noopAsync,
        recordingLane: null,
        countInLane: null,
        addGenerated: noopAsync,
        triggerUpload: () => undefined,
        toggleRecord: noopAsync,
        generateBlockReasonForLane: () => undefined,
      }) as ReturnType<typeof useStructureTimelineAudioLanes>["addAudio"],
    [],
  );

  const metronome = useMemo(
    () =>
      ({
        config: DEFAULT_METRONOME_CONFIG,
        setConfig: () => undefined,
        patchConfig: () => undefined,
      }) as ReturnType<typeof useStructureTimelineAudioLanes>["metronome"],
    [],
  );

  if (!import.meta.env.DEV) {
    return (
      <p className="p-8 text-sm text-muted-foreground">
        QA-Vorschau nur im Dev-Build verfügbar.
      </p>
    );
  }

  return (
    <PreviewShell>
      <div
        data-testid="timeline-row-alignment-preview"
        className="min-h-screen bg-background p-6"
      >
        <h1 className="mb-4 text-lg font-semibold">
          Timeline Row Alignment (QA)
        </h1>
        <div className="flex h-[640px] flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            <div className="flex min-h-min w-full">
              <div className="w-[248px] min-w-[248px] max-w-[248px] shrink-0 border-r border-border bg-card">
                <div
                  data-testid="timeline-label-beat"
                  className="flex items-center border-b border-border px-2 text-[9px] font-medium"
                  style={{ height: `${BEAT_H}px` }}
                >
                  Beat
                </div>
                <div
                  data-testid="timeline-label-act"
                  className="flex items-center border-b border-border px-2 text-[9px] font-medium"
                  style={{ height: `${ACT_H}px` }}
                >
                  Akt
                </div>
                <StructureTimelineAudioLaneLabels
                  laneProps={laneProps}
                  addAudio={addAudio}
                  metronome={metronome}
                  isLoading={false}
                />
                <div
                  data-testid="timeline-label-film-clip"
                  className="flex items-center border-b border-border bg-muted/20 px-2 text-[9px] font-semibold"
                  style={{ height: `${FILM_CLIP_H}px` }}
                >
                  Clip
                </div>
              </div>
              <div className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
                <div style={{ width: `${TOTAL_WIDTH}px` }}>
                  <div
                    data-testid="timeline-content-beat"
                    className="border-b border-border bg-muted/30"
                    style={{ height: `${BEAT_H}px` }}
                  />
                  <div
                    data-testid="timeline-content-act"
                    className="border-b border-border bg-muted/30"
                    style={{ height: `${ACT_H}px` }}
                  />
                  <StructureTimelineAudioLaneScrollRows
                    laneProps={laneProps}
                    metronome={metronome}
                    isLoading={false}
                  />
                  <div
                    data-testid="timeline-content-film-clip"
                    className="border-b border-border bg-muted/20"
                    style={{ height: `${FILM_CLIP_H}px` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}
