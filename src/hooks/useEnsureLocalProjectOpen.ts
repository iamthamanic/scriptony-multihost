/**
 * useEnsureLocalProjectOpen — ensures a local .scriptony project session is open.
 * Extracted from LocalProjectOpenGuard.tsx to respect SRP/KISS (T26).
 */

import { useEffect, useRef, useState } from "react";
import { useLocalProject } from "./useLocalProject";
import { resolveDirPathByProjectId } from "@/lib/api-adapter/local-project-resolve";

export function useEnsureLocalProjectOpen(projectId: string) {
  const { project: session, isOpen, openProject } = useLocalProject();
  const sessionMatches = isOpen && session && session.projectId === projectId;
  const [opening, setOpening] = useState(!sessionMatches);
  const [openError, setOpenError] = useState<string | null>(null);
  const openAttemptRef = useRef<string | null>(null);

  useEffect(() => {
    openAttemptRef.current = null;
  }, [projectId]);

  useEffect(() => {
    if (sessionMatches) {
      setOpening(false);
      setOpenError(null);
      return;
    }
    if (openAttemptRef.current === projectId) return;
    openAttemptRef.current = projectId;

    let cancelled = false;
    setOpening(true);
    setOpenError(null);

    void (async () => {
      try {
        const dirPath = await resolveDirPathByProjectId(projectId);
        if (!dirPath) {
          throw new Error("Projektordner im Workspace nicht gefunden.");
        }
        await openProject(dirPath);
      } catch (err) {
        if (!cancelled) {
          setOpenError(
            err instanceof Error
              ? err.message
              : "Projekt konnte nicht geöffnet werden.",
          );
        }
      } finally {
        if (!cancelled) setOpening(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, sessionMatches, openProject]);

  return { opening, openError, sessionMatches };
}
