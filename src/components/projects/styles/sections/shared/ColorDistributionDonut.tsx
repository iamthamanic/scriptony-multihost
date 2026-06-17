/**
 * Donut chart for primary/accent/neutral color share (T79 default mode).
 * Location: src/components/projects/styles/sections/shared/ColorDistributionDonut.tsx
 */

import { Label } from "../../../../ui/label";

interface ColorDistributionDonutProps {
  primary: number;
  accent: number;
  size?: number;
}

export function ColorDistributionDonut({
  primary,
  accent,
  size = 88,
}: ColorDistributionDonutProps) {
  const safePrimary = Math.max(0, Math.min(1, primary));
  const safeAccent = Math.max(0, Math.min(1, accent));
  const neutral = Math.max(0, 1 - safePrimary - safeAccent);
  const pDeg = safePrimary * 360;
  const aDeg = safeAccent * 360;
  const gradient = `conic-gradient(
    hsl(var(--primary)) 0deg ${pDeg}deg,
    hsl(var(--accent)) ${pDeg}deg ${pDeg + aDeg}deg,
    hsl(var(--muted)) ${pDeg + aDeg}deg 360deg
  )`;

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative shrink-0 rounded-full"
        style={{ width: size, height: size, background: gradient }}
        role="img"
        aria-label={`Primary ${Math.round(safePrimary * 100)} Prozent, Accent ${Math.round(safeAccent * 100)} Prozent`}
      >
        <div
          className="absolute inset-[22%] rounded-full bg-card border"
          aria-hidden
        />
      </div>
      <div className="space-y-1 text-xs text-muted-foreground min-w-0">
        <Label className="text-sm text-foreground">Verteilung</Label>
        <p>Primary {Math.round(safePrimary * 100)}%</p>
        <p>Accent {Math.round(safeAccent * 100)}%</p>
        <p>Neutral {Math.round(neutral * 100)}%</p>
      </div>
    </div>
  );
}
