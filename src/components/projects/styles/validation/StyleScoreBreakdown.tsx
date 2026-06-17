/**
 * Score breakdown bars for validation tab (Step 5).
 * Location: src/components/projects/styles/validation/StyleScoreBreakdown.tsx
 */

import type { StyleAnalysisScores } from "@/lib/style-profile/analyze-style";
import type { StyleAssetCheck } from "@/lib/style-profile/analyze-style-remote";
import { formatScorePercent } from "@/lib/style-profile/analyze-style";

interface StyleScoreBreakdownProps {
  scores: StyleAnalysisScores;
  assetChecks?: StyleAssetCheck[] | null;
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {formatScorePercent(value)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function StyleScoreBreakdown({
  scores,
  assetChecks,
}: StyleScoreBreakdownProps) {
  const checked = assetChecks?.filter((c) => c.status !== "skipped") ?? [];
  const okCount = checked.filter((c) => c.status === "ok").length;
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h4 className="text-sm font-medium">Consistency Scores</h4>
      <ScoreRow label="Gesamt" value={scores.overall} />
      <ScoreRow label="Farbe" value={scores.color} />
      <ScoreRow label="Linie" value={scores.line} />
      <ScoreRow label="Form" value={scores.shape} />
      <ScoreRow label="Charakter" value={scores.character} />
      <ScoreRow label="Tool Settings" value={scores.toolSettings} />
      <p className="text-xs text-muted-foreground pt-1">
        Sektionen: {scores.configuredSections}/{scores.totalSections}{" "}
        konfiguriert
        {checked.length > 0
          ? ` — Assets: ${okCount}/${checked.length} ok`
          : " — Heuristik / KI"}
      </p>
    </div>
  );
}
