/**
 * MixerSlider — subtle DAW-style range input (no browser accent-primary).
 */

import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../../lib/utils";
import "./mixer-slider.css";

export interface MixerSliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
  /** pan: white thumb + transparent track; volume: muted thumb */
  variant?: "volume" | "pan";
  className?: string;
}

export function MixerSlider({
  min,
  max,
  step,
  value,
  onChange,
  ariaLabel,
  variant = "volume",
  className,
}: MixerSliderProps) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      aria-label={ariaLabel}
      className={cn(
        "mixer-slider bg-transparent",
        variant === "pan" ? "pan-slider" : "volume-slider",
        className,
      )}
    />
  );
}

export function MixerSliderTrack({
  children,
  style,
  className,
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex-1 flex items-center h-1 min-w-0 rounded-full bg-white/10 overflow-hidden",
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
}
