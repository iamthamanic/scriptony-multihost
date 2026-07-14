/**
 * Waveform footer for MveDialogClipCard — real peaks, loading placeholder,
 * or a "Kein Audio" empty state when no clip is bound yet.
 * Location: src/components/structure/timeline/mve/MveDialogClipWaveformFooter.tsx
 */

import { formatDurationHms } from "@/lib/audio-utils";
import { MveDurationChip } from "./MveDurationChip";

const MAX_WAVEFORM_SAMPLES = 200;

export interface MveDialogClipWaveformFooterProps {
  clipWidthPx: number;
  waveformData?: number[];
  /** Whether an audio clip is bound to this line (peaks may still be loading). */
  hasAudioClip?: boolean;
  /** Bound audio clip length in seconds (shown when hasAudioClip). */
  audioDurationSec?: number;
  /** When false, duration chip lives in header (bound audio). Default true. */
  showDurationChip?: boolean;
}

function AudioDurationChipOverlay({
  audioDurationSec,
}: {
  audioDurationSec: number;
}) {
  return (
    <MveDurationChip
      label={formatDurationHms(audioDurationSec)}
      variant="audio"
      className="absolute right-1 top-1/2 z-10 -translate-y-1/2"
      data-testid="mve-dialog-clip-audio-duration"
    />
  );
}

export function MveDialogClipWaveformFooter({
  clipWidthPx,
  waveformData,
  hasAudioClip,
  audioDurationSec,
  showDurationChip = true,
}: MveDialogClipWaveformFooterProps) {
  const peaks = waveformData?.length
    ? waveformData.length > MAX_WAVEFORM_SAMPLES
      ? waveformData.slice(0, MAX_WAVEFORM_SAMPLES)
      : waveformData
    : null;
  const showAudioDurationChip =
    showDurationChip &&
    hasAudioClip &&
    audioDurationSec != null &&
    audioDurationSec > 0;

  if (!peaks && !hasAudioClip) {
    return (
      <div
        className="shrink-0 flex h-7 items-center gap-1.5 border-t border-white/10 px-1.5"
        data-testid="mve-dialog-clip-waveform-empty"
      >
        <div className="h-px flex-1 bg-white/10" aria-hidden="true" />
        <span className="shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-1.5 py-px text-[8px] font-medium leading-tight text-white/40">
          Kein Audio
        </span>
        <div className="h-px flex-1 bg-white/10" aria-hidden="true" />
      </div>
    );
  }

  if (peaks) {
    return (
      <div
        className="relative shrink-0 h-7 border-t border-white/15 bg-black/20"
        data-testid="mve-dialog-clip-waveform"
      >
        {showAudioDurationChip ? (
          <AudioDurationChipOverlay audioDurationSec={audioDurationSec} />
        ) : null}
        <svg
          className="absolute inset-0 h-full w-full"
          width={clipWidthPx}
          height="100%"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {peaks.map((peak, i) => {
            const barWidth = clipWidthPx / peaks.length;
            const x = i * barWidth;
            const safePeak = Math.max(0, Math.min(1, peak));
            const heightPct = Math.max(safePeak * 100, 2);
            const y = (100 - heightPct) / 2;
            return (
              <rect
                key={`wf-${i}`}
                x={`${x}px`}
                y={`${y}%`}
                width={`${barWidth}px`}
                height={`${heightPct}%`}
                fill="white"
                opacity={0.55}
                rx={1}
              />
            );
          })}
        </svg>
      </div>
    );
  }

  return (
    <div
      className="relative shrink-0 flex h-7 items-end gap-px border-t border-white/15 px-1 py-0.5 opacity-50"
      aria-hidden
      data-testid="mve-dialog-clip-waveform"
    >
      {showAudioDurationChip ? (
        <AudioDurationChipOverlay audioDurationSec={audioDurationSec} />
      ) : null}
      {Array.from({ length: 28 }, (_, i) => (
        <div
          key={i}
          className="min-w-[2px] flex-1 rounded-sm bg-white/70"
          style={{ height: `${30 + (i % 7) * 10}%` }}
        />
      ))}
    </div>
  );
}
