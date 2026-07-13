/**
 * Compact inline progress panel (matches global loading host styling).
 * Location: src/components/characters/InlineTaskProgress.tsx
 */

import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { clampLoadingPercent } from "@/lib/loading/global-loading-progress";

export interface InlineTaskProgressProps {
  title: string;
  message: string;
  percent: number;
  className?: string;
  testId?: string;
}

export function InlineTaskProgress({
  title,
  message,
  percent,
  className,
  testId,
}: InlineTaskProgressProps) {
  const pct = clampLoadingPercent(percent);

  return (
    <div
      className={className}
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid={testId}
    >
      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <Loader2
            className="h-3.5 w-3.5 shrink-0 animate-spin text-primary mt-0.5"
            aria-hidden
          />
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-foreground truncate">
                {title}
              </p>
              <span className="text-[11px] font-bold tabular-nums text-primary shrink-0">
                {pct}%
              </span>
            </div>
            <p className="text-[10px] leading-snug text-muted-foreground truncate">
              {message}
            </p>
          </div>
        </div>
        <Progress
          value={pct}
          className="h-1"
          aria-label={`${title} — ${pct}%`}
        />
      </div>
    </div>
  );
}
