/** Loads worldbuilding + style guide after LocalProjectOpenGuard opens SQLite. */
import { useEffect, useRef } from "react";

export function ProjectDetailLocalDataEffect({
  projectId,
  linkedWorldId,
  onReady,
}: {
  projectId: string;
  linkedWorldId?: string | null;
  onReady: (projectId: string, linkedWorldId?: string | null) => void;
}) {
  const loadedRef = useRef<string | null>(null);
  useEffect(() => {
    if (loadedRef.current === projectId) return;
    loadedRef.current = projectId;
    onReady(projectId, linkedWorldId);
  }, [projectId, linkedWorldId, onReady]);
  return null;
}
