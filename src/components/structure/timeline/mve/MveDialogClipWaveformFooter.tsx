/**
 * Waveform footer for MveDialogClipCard — real peaks or placeholder bars.
 * Location: src/components/structure/timeline/mve/MveDialogClipWaveformFooter.tsx
 */

const MAX_WAVEFORM_SAMPLES = 200;

export interface MveDialogClipWaveformFooterProps {
  clipWidthPx: number;
  waveformData?: number[];
}

export function MveDialogClipWaveformFooter({
  clipWidthPx,
  waveformData,
}: MveDialogClipWaveformFooterProps) {
  const peaks = waveformData?.length
    ? waveformData.length > MAX_WAVEFORM_SAMPLES
      ? waveformData.slice(0, MAX_WAVEFORM_SAMPLES)
      : waveformData
    : null;

  if (peaks) {
    return (
      <div
        className="relative shrink-0 h-7 border-t border-white/15 bg-black/20"
        data-testid="mve-dialog-clip-waveform"
      >
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
      className="shrink-0 flex h-7 items-end gap-px border-t border-white/15 px-1 py-0.5 opacity-50"
      aria-hidden
      data-testid="mve-dialog-clip-waveform"
    >
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
