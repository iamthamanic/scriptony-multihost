/**
 * DEV-only QA harness — Structure Timeline row alignment (labels vs lanes).
 * Mirrors the #49 row-pair layout: one scroller, sticky label cells, content
 * origin element, playhead scrub via the real timeline-scrub-utils.
 * Location: src/components/qa/TimelineRowAlignmentPreviewPage.tsx
 */

import { useMemo, useRef, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAudioLaneState } from "@/hooks/useAudioLaneState";
import { StructureTimelineAudioRowPairs } from "@/components/structure/timeline/tracks/StructureTimelineAudioLanes";
import { DEFAULT_METRONOME_CONFIG } from "@/lib/audio/metronome-config";
import { timeSecFromTimelineClientX } from "@/hooks/timeline/timeline-scrub-utils";
import type { useStructureTimelineAudioLanes } from "@/components/structure/timeline/tracks/StructureTimelineAudioLanes";
import type { Character } from "@/lib/types";

const LANE_INDEX = 0;
const BEAT_H = 40;
const ACT_H = 40;
const FILM_CLIP_H = 32;
const LABEL_W = 248;
const TOTAL_WIDTH = 1600;
const PX_PER_SEC = 20;
const DURATION_SEC = TOTAL_WIDTH / PX_PER_SEC;
const NOW = "2026-07-04T12:00:00.000Z";

const STICKY_CELL_CLASS =
  "sticky left-0 z-30 shrink-0 overflow-hidden bg-card border-r border-border";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentOriginRef = useRef<HTMLDivElement>(null);
  const [playheadSec, setPlayheadSec] = useState(0);
  const [viewStartSec, setViewStartSec] = useState(0);
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

  /** Ruler click → time via the real scrub util (content-origin anchored). */
  const onRulerClick = (event: React.PointerEvent<HTMLDivElement>) => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const timeSec = timeSecFromTimelineClientX(
      event.clientX,
      scrollEl,
      PX_PER_SEC,
      DURATION_SEC,
      contentOriginRef.current,
    );
    setPlayheadSec(timeSec);
  };

  // Window-relative playhead position — same convention as the real editor.
  const playheadLeftPx = (playheadSec - viewStartSec) * PX_PER_SEC;

  return (
    <PreviewShell>
      <div
        data-testid="timeline-row-alignment-preview"
        className="min-h-screen bg-background p-6"
      >
        <h1 className="mb-4 text-lg font-semibold">
          Timeline Row Alignment (QA)
        </h1>
        <p className="mb-2 text-xs text-muted-foreground">
          Playhead:{" "}
          <span data-testid="qa-playhead-sec">{playheadSec.toFixed(2)}</span>s
        </p>
        <div className="flex h-[640px] flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div
            ref={scrollRef}
            data-testid="qa-timeline-scroller"
            className="flex-1 min-h-0 overflow-auto"
            onScroll={(e) =>
              setViewStartSec(e.currentTarget.scrollLeft / PX_PER_SEC)
            }
          >
            <div
              className="relative min-h-min"
              style={{ width: `${LABEL_W + TOTAL_WIDTH}px` }}
            >
              {/* Row: Zeit | Ruler */}
              <div className="flex">
                <div
                  data-testid="timeline-label-zeit"
                  className={STICKY_CELL_CLASS}
                  style={{ width: `${LABEL_W}px` }}
                >
                  <div className="flex h-12 items-center border-b border-border px-2 text-[9px] font-medium">
                    Zeit
                  </div>
                </div>
                <div
                  data-testid="timeline-content-ruler"
                  className="h-12 shrink-0 cursor-pointer border-b border-border bg-muted/10"
                  style={{ width: `${TOTAL_WIDTH}px` }}
                  onPointerDown={onRulerClick}
                />
              </div>

              {/* Row: Beat */}
              <div className="flex">
                <div
                  className={STICKY_CELL_CLASS}
                  style={{ width: `${LABEL_W}px` }}
                >
                  <div
                    data-testid="timeline-label-beat"
                    className="flex items-center border-b border-border px-2 text-[9px] font-medium"
                    style={{ height: `${BEAT_H}px` }}
                  >
                    Beat
                  </div>
                </div>
                <div
                  data-testid="timeline-content-beat"
                  className="shrink-0 border-b border-border bg-muted/30"
                  style={{ height: `${BEAT_H}px`, width: `${TOTAL_WIDTH}px` }}
                />
              </div>

              {/* Row: Act */}
              <div className="flex">
                <div
                  className={STICKY_CELL_CLASS}
                  style={{ width: `${LABEL_W}px` }}
                >
                  <div
                    data-testid="timeline-label-act"
                    className="flex items-center border-b border-border px-2 text-[9px] font-medium"
                    style={{ height: `${ACT_H}px` }}
                  >
                    Akt
                  </div>
                </div>
                <div
                  data-testid="timeline-content-act"
                  className="shrink-0 border-b border-border bg-muted/30"
                  style={{ height: `${ACT_H}px`, width: `${TOTAL_WIDTH}px` }}
                />
              </div>

              {/* Audio lanes: per-lane row pairs (#50) */}
              <StructureTimelineAudioRowPairs
                laneProps={laneProps}
                addAudio={addAudio}
                metronome={metronome}
                isLoading={false}
                labelCellClassName={STICKY_CELL_CLASS}
                labelColumnWidthPx={LABEL_W}
                totalWidthPx={TOTAL_WIDTH}
              />

              {/* Row: Film clip */}
              <div className="flex">
                <div
                  className={STICKY_CELL_CLASS}
                  style={{ width: `${LABEL_W}px` }}
                >
                  <div
                    data-testid="timeline-label-film-clip"
                    className="flex items-center border-b border-border bg-muted/20 px-2 text-[9px] font-semibold"
                    style={{ height: `${FILM_CLIP_H}px` }}
                  >
                    Clip
                  </div>
                </div>
                <div
                  data-testid="timeline-content-film-clip"
                  className="shrink-0 border-b border-border bg-muted/20"
                  style={{
                    height: `${FILM_CLIP_H}px`,
                    width: `${TOTAL_WIDTH}px`,
                  }}
                />
              </div>

              {/* Content origin (t=0 anchor) + playhead */}
              <div
                ref={contentOriginRef}
                data-testid="timeline-content-origin"
                className="pointer-events-none absolute inset-y-0 z-20"
                style={{ left: `${LABEL_W}px`, width: `${TOTAL_WIDTH}px` }}
              >
                <div
                  data-testid="qa-playhead-line"
                  className="absolute inset-y-0 w-0.5 bg-red-500"
                  style={{ left: `${playheadLeftPx}px` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}
