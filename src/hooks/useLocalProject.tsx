/**
 * Local project session — open/close .scriptony folder (T38).
 *
 * Location: src/hooks/useLocalProject.tsx
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LocalProjectContext } from "@/backend/local/LocalProjectContext";
import { startSidecar, stopSidecar } from "@/lib/local/sidecar-lifecycle";

interface LocalProjectSessionValue {
  project: LocalProjectContext | null;
  isOpen: boolean;
  openProject: (dirPath: string) => Promise<LocalProjectContext>;
  closeProject: () => Promise<void>;
}

const LocalProjectSessionContext =
  createContext<LocalProjectSessionValue | null>(null);

export function LocalProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<LocalProjectContext | null>(null);

  const closeProject = useCallback(async () => {
    if (project) {
      await stopSidecar();
      await project.close();
      setProject(null);
    }
  }, [project]);

  const openProject = useCallback(
    async (dirPath: string) => {
      const previous = project;
      const ctx = await LocalProjectContext.open(dirPath);
      if (previous) {
        await previous.close();
      }
      setProject(ctx);
      await startSidecar(ctx.dirPath);
      return ctx;
    },
    [project],
  );

  const value = useMemo(
    () => ({
      project,
      isOpen: project !== null,
      openProject,
      closeProject,
    }),
    [project, openProject, closeProject],
  );

  return (
    <LocalProjectSessionContext.Provider value={value}>
      {children}
    </LocalProjectSessionContext.Provider>
  );
}

/** Optional session when LocalProjectProvider is absent (e.g. tests with backend override). */
export function useLocalProjectOptional(): LocalProjectSessionValue | null {
  return useContext(LocalProjectSessionContext);
}

export function useLocalProject(): LocalProjectSessionValue {
  const ctx = useLocalProjectOptional();
  if (!ctx) {
    throw new Error("useLocalProject must be used inside LocalProjectProvider");
  }
  return ctx;
}
