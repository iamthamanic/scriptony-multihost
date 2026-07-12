/**
 * Cross-track structure stack: CapCut marquee + context menu shell.
 * Location: src/components/timeline/TimelineStructureSelectionStack.tsx
 */

import type { ReactNode, RefObject } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu";
import { cn } from "../ui/utils";
import type { TimelineMarqueeSelectionApi } from "../../hooks/useTimelineMarqueeSelection";
import type { TimelineInteractionMode } from "../../lib/timeline-selection/types";
import { TimelineMarqueeOverlay } from "./TimelineMarqueeOverlay";

interface TimelineStructureSelectionStackProps {
  stackRef: RefObject<HTMLElement | null>;
  widthPx: number;
  interactionMode: TimelineInteractionMode;
  selectionApi: TimelineMarqueeSelectionApi;
  children: ReactNode;
}

export function TimelineStructureSelectionStack({
  stackRef,
  widthPx,
  interactionMode,
  selectionApi,
  children,
}: TimelineStructureSelectionStackProps) {
  const count = selectionApi.scopedSelectionCount;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={stackRef as RefObject<HTMLDivElement>}
          className={cn(
            "relative",
            interactionMode === "select" && "cursor-crosshair",
          )}
          style={{ width: `${widthPx}px` }}
          onPointerDownCapture={(e) =>
            selectionApi.handleStackPointerDownCapture(e, interactionMode)
          }
          onPointerDown={(e) =>
            selectionApi.handleStackPointerDown(e, interactionMode)
          }
          onContextMenu={(e) => selectionApi.handleStackContextMenu(e)}
        >
          {children}
          <TimelineMarqueeOverlay rect={selectionApi.getMarqueeRect()} />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem
          disabled={count !== 1}
          onSelect={selectionApi.runEditSingle}
        >
          Bearbeiten
        </ContextMenuItem>
        <ContextMenuItem
          disabled={count === 0}
          onSelect={selectionApi.runBatchDuplicate}
        >
          Duplizieren{count > 0 ? ` (${count})` : ""}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          disabled={count === 0}
          variant="destructive"
          onSelect={selectionApi.runBatchDelete}
        >
          Löschen{count > 0 ? ` (${count})` : ""}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
