/**
 * Resizable height for Structure & Beats timeline panel (per project, localStorage).
 * Location: src/hooks/useStructureTimelinePanelHeight.ts
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampStructureTimelinePanelHeightPx,
  defaultStructureTimelinePanelHeightPx,
  persistStructureTimelinePanelHeightPx,
  resolveStructureTimelinePanelHeightPx,
} from "@/lib/structure/structure-timeline-panel-height";

export type StructureTimelinePanelResizeHandleProps = {
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onDoubleClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  isResizing: boolean;
};

export function useStructureTimelinePanelHeight(
  projectId: string,
  projectType: string | undefined,
  enabled: boolean,
): {
  heightPx: number;
  resizeHandleProps: StructureTimelinePanelResizeHandleProps;
} {
  const [heightPx, setHeightPx] = useState(() =>
    resolveStructureTimelinePanelHeightPx(projectId, projectType),
  );
  const [isResizing, setIsResizing] = useState(false);
  const heightPxRef = useRef(heightPx);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  heightPxRef.current = heightPx;

  useEffect(() => {
    setHeightPx(resolveStructureTimelinePanelHeightPx(projectId, projectType));
  }, [projectId, projectType]);

  useEffect(() => {
    const onWindowResize = () => {
      setHeightPx((current) =>
        clampStructureTimelinePanelHeightPx(current, projectType),
      );
    };
    window.addEventListener("resize", onWindowResize);
    return () => window.removeEventListener("resize", onWindowResize);
  }, [projectType]);

  useEffect(() => {
    if (!isResizing) return;

    const onPointerMove = (event: PointerEvent) => {
      const deltaY = event.clientY - startYRef.current;
      setHeightPx(
        clampStructureTimelinePanelHeightPx(
          startHeightRef.current + deltaY,
          projectType,
        ),
      );
    };

    const onPointerUp = () => {
      setIsResizing(false);
      persistStructureTimelinePanelHeightPx(
        projectId,
        heightPxRef.current,
        projectType,
      );
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isResizing, projectId, projectType]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled) return;
      event.preventDefault();
      event.stopPropagation();
      setIsResizing(true);
      startYRef.current = event.clientY;
      startHeightRef.current = heightPxRef.current;
    },
    [enabled],
  );

  const onDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const next = defaultStructureTimelinePanelHeightPx(projectType);
      setHeightPx(next);
      persistStructureTimelinePanelHeightPx(projectId, next, projectType);
    },
    [projectId, projectType],
  );

  return {
    heightPx,
    resizeHandleProps: {
      onPointerDown,
      onDoubleClick,
      isResizing,
    },
  };
}
