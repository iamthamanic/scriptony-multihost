/**
 * Style strength circular gauge with optional score (Step 5).
 * Location: src/components/projects/styles/StyleStrengthGauge.tsx
 */

import { Loader2 } from "lucide-react";
import { Button } from "../../ui/button";
import { formatScorePercent } from "@/lib/style-profile/analyze-style";

interface StyleStrengthGaugeProps {
  score?: number | null;
  analyzed?: boolean;
  analyzing?: boolean;
  onAnalyze?: () => void;
}

export function StyleStrengthGauge({
  score,
  analyzed,
  analyzing,
  onAnalyze,
}: StyleStrengthGaugeProps) {
  const hasScore = score != null && Number.isFinite(score);
  const pct = hasScore ? Math.round(score * 100) : null;
  const ringStyle = hasScore
    ? {
        background: `conic-gradient(hsl(var(--primary)) ${pct! * 3.6}deg, hsl(var(--muted)) 0deg)`,
      }
    : undefined;

  return (
    <div className="rounded-lg border p-3 space-y-3 bg-muted/20">
      <p className="text-xs font-medium text-muted-foreground">
        Style Strength
      </p>
      <div className="flex flex-col items-center gap-1">
        <div
          className="relative size-16 rounded-full flex items-center justify-center"
          style={ringStyle}
          aria-label={
            hasScore ? `Style Strength ${pct} Prozent` : "Nicht analysiert"
          }
        >
          <div className="absolute inset-1 rounded-full bg-card flex items-center justify-center border">
            <span className="text-lg font-semibold tabular-nums">
              {hasScore ? `${pct}%` : "—"}
            </span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground text-center">
          {hasScore
            ? analyzed
              ? "Analysiert"
              : formatScorePercent(score!)
            : "Heuristik — Analyse starten"}
        </span>
      </div>
      <Button
        type="button"
        className="w-full"
        size="sm"
        disabled={analyzing || !onAnalyze}
        onClick={onAnalyze}
      >
        {analyzing ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
        Analyze Style
      </Button>
    </div>
  );
}
