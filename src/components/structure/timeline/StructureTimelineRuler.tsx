/**
 * Time ruler with adaptive major/minor ticks and book page markers (Epic T55d / T62).
 * Location: src/components/structure/timeline/StructureTimelineRuler.tsx
 */

import type { PointerEvent } from "react";
import { cn } from "../../ui/utils";
import type { RulerTick } from "@/lib/timeline-ruler-scale";

export type StructureTimelineRulerTick = RulerTick & { label: string };

export interface StructureTimelinePageMarker {
  x: number;
  page: number;
}

export interface StructureTimelineRulerProps {
  ticks: StructureTimelineRulerTick[];
  minorTicks: RulerTick[];
  pageMarkers: StructureTimelinePageMarker[];
  isBookProject: boolean;
  onRulerClick: (event: PointerEvent<HTMLDivElement>) => void;
}

export function StructureTimelineRuler({
  ticks,
  minorTicks,
  pageMarkers,
  isBookProject,
  onRulerClick,
}: StructureTimelineRulerProps) {
  return (
    <div
      className="relative h-12 bg-card border-b border-border cursor-pointer"
      onPointerDown={onRulerClick}
    >
      {minorTicks.map((tick) => (
        <div
          key={`minor-${tick.sec}`}
          className="absolute top-0 w-px h-2 bg-border/70"
          style={{ left: `${tick.x}px` }}
        />
      ))}

      {ticks.map((tick) => (
        <div
          key={`major-${tick.sec}`}
          className="absolute top-0 flex flex-col items-center"
          style={{ left: `${tick.x}px` }}
        >
          <div className="w-px h-3 bg-border" />
          <span className="text-[9px] text-muted-foreground font-mono mt-0.5 whitespace-nowrap">
            {tick.label}
          </span>
        </div>
      ))}

      {isBookProject &&
        pageMarkers.map((marker, index) => {
          const isWholePage = marker.page % 1 === 0;
          return (
            <div
              key={`page-${marker.page}-${index}`}
              className="absolute bottom-0 flex flex-col items-center"
              style={{ left: `${marker.x}px` }}
            >
              <div className="w-px h-1.5 bg-border" />
              <span
                className={cn(
                  "text-[9px] font-mono mt-6 whitespace-nowrap",
                  isWholePage
                    ? "text-primary font-bold"
                    : "text-muted-foreground",
                )}
              >
                S.
                {marker.page % 1 === 0
                  ? marker.page.toFixed(0)
                  : marker.page.toFixed(1)}
              </span>
            </div>
          );
        })}
    </div>
  );
}
