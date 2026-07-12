/**
 * PanSliderTrack — center-neutral pan rail (blue ← center, red → center).
 */

import { cn } from "../../../lib/utils";
import { getPanTrackGradient } from "../../../lib/audio-lane";
import { MixerSlider } from "./MixerSlider";

export interface PanSliderTrackProps {
  pan: number;
  onChange: (pan: number) => void;
  ariaLabel: string;
  className?: string;
}

export function PanSliderTrack({
  pan,
  onChange,
  ariaLabel,
  className,
}: PanSliderTrackProps) {
  return (
    <span className={cn("pan-slider-track", className)}>
      <span
        className="pan-slider-rail"
        style={{ background: getPanTrackGradient(pan) }}
        aria-hidden
      />
      <span className="pan-slider-center" aria-hidden />
      <MixerSlider
        variant="pan"
        min={-1}
        max={1}
        step={0.01}
        value={pan}
        onChange={onChange}
        ariaLabel={ariaLabel}
      />
    </span>
  );
}
