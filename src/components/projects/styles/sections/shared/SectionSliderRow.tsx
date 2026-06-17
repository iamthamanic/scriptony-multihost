/**
 * Labeled slider row for style section machineParams (T79).
 * Location: src/components/projects/styles/sections/shared/SectionSliderRow.tsx
 */

import { Slider } from "../../../../ui/slider";
import { Label } from "../../../../ui/label";

interface SectionSliderRowProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  format?: (value: number) => string;
  readOnly?: boolean;
  onChange: (value: number) => void;
}

export function SectionSliderRow({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  format,
  readOnly,
  onChange,
}: SectionSliderRowProps) {
  const display = format
    ? format(value)
    : String(Math.round(value * 100) / 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm">{label}</Label>
        <span className="text-xs text-muted-foreground tabular-nums">
          {display}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        disabled={readOnly}
        onValueChange={(v) => onChange(v[0] ?? min)}
      />
    </div>
  );
}
