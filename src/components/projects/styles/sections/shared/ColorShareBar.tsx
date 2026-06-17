/**
 * Primary/accent/neutral share bar for colorSystem section (T79).
 * Location: src/components/projects/styles/sections/shared/ColorShareBar.tsx
 */

import { Label } from "../../../../ui/label";

interface ColorShareBarProps {
  primary: number;
  accent: number;
}

export function ColorShareBar({ primary, accent }: ColorShareBarProps) {
  const safePrimary = Math.max(0, Math.min(1, primary));
  const safeAccent = Math.max(0, Math.min(1, accent));
  const neutral = Math.max(0, 1 - safePrimary - safeAccent);

  return (
    <div className="space-y-2">
      <Label className="text-sm">Farbverteilung</Label>
      <div className="flex h-3 w-full overflow-hidden rounded-full border">
        <div
          className="bg-primary transition-all"
          style={{ width: `${safePrimary * 100}%` }}
          title={`Primary ${Math.round(safePrimary * 100)}%`}
        />
        <div
          className="bg-accent transition-all"
          style={{ width: `${safeAccent * 100}%` }}
          title={`Accent ${Math.round(safeAccent * 100)}%`}
        />
        <div
          className="bg-muted flex-1"
          title={`Neutral ${Math.round(neutral * 100)}%`}
        />
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>Primary {Math.round(safePrimary * 100)}%</span>
        <span>Accent {Math.round(safeAccent * 100)}%</span>
        <span>Neutral {Math.round(neutral * 100)}%</span>
      </div>
    </div>
  );
}
