/**
 * VolumeSliderTrack — visible rail + fill + white thumb (DAW-style).
 */

import { cn } from "../../../lib/utils";
import { MixerSlider } from "./MixerSlider";

export interface VolumeSliderTrackProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
  className?: string;
}

function volumeFillPercent(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  const clamped = Math.max(min, Math.min(max, value));
  return ((clamped - min) / (max - min)) * 100;
}

export function VolumeSliderTrack({
  min,
  max,
  step,
  value,
  onChange,
  ariaLabel,
  className,
}: VolumeSliderTrackProps) {
  const fillPercent = volumeFillPercent(value, min, max);

  return (
    <span className={cn("volume-slider-track", className)}>
      <span className="volume-slider-rail" aria-hidden />
      <span
        className="volume-slider-fill"
        style={{ width: `${fillPercent}%` }}
        aria-hidden
      />
      <MixerSlider
        variant="volume"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        ariaLabel={ariaLabel}
      />
    </span>
  );
}
