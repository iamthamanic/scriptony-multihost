/**
 * Scrubbable waveform with playhead for voice design preview audio.
 * Location: src/components/characters/VoiceDesignCandidateWaveform.tsx
 */

import { useCallback, useRef, type PointerEvent } from "react";
import type { VoiceDesignCandidatePlaybackView } from "@/hooks/useVoiceDesignCandidatePlayback";

export interface VoiceDesignCandidateWaveformProps {
  candidateIndex: number;
  view: VoiceDesignCandidatePlaybackView;
  onSeek: (ratio: number) => void;
}

function ratioFromClientX(clientX: number, rect: DOMRect): number {
  if (rect.width <= 0) return 0;
  return (clientX - rect.left) / rect.width;
}

export function VoiceDesignCandidateWaveform({
  candidateIndex,
  view,
  onSeek,
}: VoiceDesignCandidateWaveformProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrubbingRef = useRef(false);

  const peaks =
    view.peaks.length > 0
      ? view.peaks
      : Array.from({ length: 48 }, (_, index) => 0.12 + (index % 5) * 0.04);

  const progress =
    view.durationSec > 0
      ? Math.max(0, Math.min(1, view.currentTimeSec / view.durationSec))
      : 0;

  const applySeek = useCallback(
    (clientX: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      onSeek(ratioFromClientX(clientX, rect));
    },
    [onSeek],
  );

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (view.isLoading || view.durationSec <= 0) return;
    scrubbingRef.current = true;
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    applySeek(event.clientX);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    applySeek(event.clientX);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    if (typeof event.currentTarget.releasePointerCapture === "function") {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative h-10 min-w-0 flex-1 cursor-pointer rounded-md border border-border/60 bg-muted/20"
      data-testid={`voice-design-waveform-${candidateIndex}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="slider"
      aria-label="Vorschau-Position"
      aria-valuemin={0}
      aria-valuemax={view.durationSec}
      aria-valuenow={view.currentTimeSec}
      tabIndex={0}
      onKeyDown={(event) => {
        if (view.durationSec <= 0) return;
        const step = event.shiftKey ? 0.1 : 0.02;
        if (event.key === "ArrowRight") {
          event.preventDefault();
          onSeek(progress + step);
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          onSeek(progress - step);
        }
      }}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {peaks.map((peak, index) => {
          const x = (index / peaks.length) * 100;
          const width = 100 / peaks.length;
          const safePeak = Math.max(0, Math.min(1, peak));
          const heightPct = Math.max(safePeak * 100, 4);
          const y = (100 - heightPct) / 2;
          const played = index / peaks.length <= progress;
          return (
            <rect
              key={`peak-${index}`}
              x={`${x}%`}
              y={`${y}%`}
              width={`${width}%`}
              height={`${heightPct}%`}
              className={
                played ? "fill-primary/80" : "fill-muted-foreground/45"
              }
              rx={0.5}
            />
          );
        })}
      </svg>
      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 bg-primary shadow-sm"
        style={{ left: `${progress * 100}%` }}
        data-testid={`voice-design-playhead-${candidateIndex}`}
      />
    </div>
  );
}
