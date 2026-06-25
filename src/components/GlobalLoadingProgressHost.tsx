/**
 * Global overlay for long-running loads (5s+): progress bar, %, status text.
 * Location: src/components/GlobalLoadingProgressHost.tsx
 */

import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  clampLoadingPercent,
  type ActiveLoadingTask,
} from "@/lib/loading/global-loading-progress";

export interface GlobalLoadingProgressHostProps {
  task: ActiveLoadingTask | null;
  taskCount: number;
}

export function GlobalLoadingProgressHost({
  task,
  taskCount,
}: GlobalLoadingProgressHostProps) {
  if (!task) return null;

  const pct = clampLoadingPercent(task.percent);

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[10050] w-[min(22rem,calc(100vw-2rem))]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur-sm space-y-2.5">
        <div className="flex items-start gap-2">
          <Loader2
            className="h-4 w-4 shrink-0 animate-spin text-primary mt-0.5"
            aria-hidden
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-foreground truncate">
                {task.title}
              </p>
              <span className="text-xs font-bold tabular-nums text-primary shrink-0">
                {pct}%
              </span>
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              {task.message}
            </p>
            {taskCount > 1 ? (
              <p className="text-[10px] text-muted-foreground/80">
                {taskCount} Vorgänge aktiv
              </p>
            ) : null}
          </div>
        </div>
        <Progress
          value={pct}
          className="h-1.5"
          aria-label={`${task.title} — ${pct}%`}
        />
      </div>
    </div>
  );
}
