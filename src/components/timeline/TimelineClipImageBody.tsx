/**
 * Shared shot/scene clip interior: thumbnail, full-bleed cover, or placeholder.
 * Location: src/components/timeline/TimelineClipImageBody.tsx
 */

import { Camera } from "lucide-react";
import { cn } from "../ui/utils";
import { getTimelineClipImageLayout } from "../../lib/timeline-clip-preview-url";
import { useResolvedProjectAssetUrl } from "@/hooks/useResolvedProjectAssetUrl";

interface TimelineClipImageBodyProps {
  imgUrl: string;
  displayText: string;
  clipWidthPx: number;
  /** Label on full-bleed (light text + shadow). */
  fullBleedTextClassName: string;
  /** Label beside thumbnail. */
  inlineTextClassName: string;
  placeholderClassName?: string;
  thumbBorderClassName?: string;
  onPlaceholderClick?: () => void;
  /** When true, image/thumbnail only (title rendered by overlay). */
  hideLabel?: boolean;
}

export function TimelineClipImageBody({
  imgUrl,
  displayText,
  clipWidthPx,
  fullBleedTextClassName,
  inlineTextClassName,
  placeholderClassName = "border border-dashed border-muted-foreground/45 bg-muted/40",
  thumbBorderClassName = "border border-muted-foreground/40 bg-muted",
  onPlaceholderClick,
  hideLabel = false,
}: TimelineClipImageBodyProps) {
  const layout = getTimelineClipImageLayout(clipWidthPx, imgUrl);
  const resolvedUrl = useResolvedProjectAssetUrl(imgUrl);
  const thumbW = Math.min(48, Math.max(26, Math.round(clipWidthPx * 0.28)));

  if (layout.fullBleed) {
    return (
      <div
        className={cn(
          "pointer-events-none h-full flex items-end justify-start px-[var(--trim-cap)] pb-0.5 min-w-0 overflow-hidden relative z-10",
          resolvedUrl && "bg-black/35",
        )}
      >
        {resolvedUrl ? (
          <img
            src={resolvedUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover -z-10"
          />
        ) : null}
        {!hideLabel ? (
          <span
            className={cn(
              "text-[10px] font-medium truncate pointer-events-auto",
              fullBleedTextClassName,
            )}
          >
            {displayText}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="pointer-events-none h-full flex items-center justify-center gap-0.5 px-[var(--trim-cap)] min-w-0 overflow-hidden relative z-10">
      {layout.sideThumb && resolvedUrl && (
        <div
          className={cn(
            "shrink-0 rounded-sm overflow-hidden my-0.5 pointer-events-auto",
            thumbBorderClassName,
          )}
          style={{
            width: thumbW,
            height: "calc(100% - 6px)",
          }}
        >
          <img
            src={resolvedUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}
      {layout.showPlaceholder && (
        <button
          type="button"
          className={cn(
            "shrink-0 flex items-center justify-center rounded-sm my-0.5",
            placeholderClassName,
            onPlaceholderClick && "cursor-pointer hover:opacity-90",
          )}
          style={{
            width: Math.min(28, clipWidthPx - 8),
            height: "calc(100% - 6px)",
          }}
          aria-label="Szenenbild hochladen"
          title="Szenenbild hochladen"
          onClick={(e) => {
            e.stopPropagation();
            onPlaceholderClick?.();
          }}
        >
          <Camera className="size-3 opacity-45" />
        </button>
      )}
      {!hideLabel ? (
        <span
          className={cn(
            "text-[10px] font-medium truncate min-w-0 pointer-events-auto",
            inlineTextClassName,
          )}
        >
          {displayText}
        </span>
      ) : null}
    </div>
  );
}
