/**
 * LevelMeter — T32 DAW Feature.
 *
 * Simple peak-level bar (0–1+, green/yellow/red).
 * Decorative component — no audio processing.
 * WCAG 2.2 AA: aria-hidden, purely visual feedback.
 */

import { cn } from "../../lib/utils";

export interface LevelMeterProps {
  /** Peak level 0–1+. Values >1 indicate clipping. */
  value: number;
  /** Height variant. "compact" = 16px, "default" = 24px */
  variant?: "compact" | "default";
  className?: string;
}

export function LevelMeter({
  value,
  variant = "default",
  className,
}: LevelMeterProps) {
  const clamped = Math.max(0, value);
  const greenMax = 0.6; // 0–60%: green
  const yellowMax = 0.85; // 60–85%: yellow
  // 85–100%+: red (clipping)

  const barHeight = variant === "compact" ? "h-4" : "h-6";

  return (
    <div
      className={cn("flex items-end gap-px", barHeight, className)}
      role="meter"
      aria-label={`Peak level ${Math.round(clamped * 100)}%`}
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={150}
    >
      {/* Green segment (0–60%) */}
      <div
        className="w-1.5 bg-green-500 rounded-sm transition-all"
        style={{ height: `${Math.min(clamped / greenMax, 1) * 100}%` }}
      />
      {/* Yellow segment (60–85%) */}
      <div
        className="w-1.5 bg-yellow-500 rounded-sm transition-all"
        style={{
          height: `${clamped > greenMax ? Math.min((clamped - greenMax) / (yellowMax - greenMax), 1) * 100 : 0}%`,
        }}
      />
      {/* Red segment (85%+) */}
      <div
        className="w-1.5 bg-red-500 rounded-sm transition-all"
        style={{
          height: `${clamped > yellowMax ? Math.min((clamped - yellowMax) / (1 - yellowMax), 1) * 100 : 0}%`,
        }}
      />
    </div>
  );
}
