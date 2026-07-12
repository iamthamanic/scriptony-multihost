/**
 * Local workspace session — root folder, project scan, refresh (T44).
 *
 * Location: src/hooks/useLocalWorkspace.tsx
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createTauriWorkspaceFs,
  getRecentProjectPaths,
  getWorkspaceRoot,
  listWorkspaceProjects,
  pickWorkspaceFolder,
  pushRecentProjectPath,
  restoreWorkspaceScope,
  type WorkspaceProjectEntry,
} from "@/local/workspace";
import { isDesktopShell } from "@/runtime/detect-runtime";

interface LocalWorkspaceValue {
  workspaceRoot: string | null;
  projects: WorkspaceProjectEntry[];
  recentPaths: string[];
  isReady: boolean;
  isLoading: boolean;
  /** Set when workspace root is stored but scan/restore failed (permissions, path). */
  loadError: string | null;
  refresh: () => Promise<void>;
  chooseWorkspaceFolder: () => Promise<string | null>;
  setRoot: (path: string) => Promise<void>;
  rememberRecent: (dirPath: string) => Promise<void>;
}

const LocalWorkspaceContext = createContext<LocalWorkspaceValue | null>(null);

export function LocalWorkspaceProvider({ children }: { children: ReactNode }) {
  const desktop = isDesktopShell();
  const [workspaceRoot, setWorkspaceRootState] = useState<string | null>(null);
  const [projects, setProjects] = useState<WorkspaceProjectEntry[]>([]);
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(desktop);
  const [hydrated, setHydrated] = useState(!desktop);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!desktop) {
      setHydrated(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const root = await getWorkspaceRoot();

      try {
        setRecentPaths(await getRecentProjectPaths());
      } catch {
        setRecentPaths([]);
      }

      if (!root) {
        setWorkspaceRootState(null);
        setProjects([]);
        setLoadError(null);
        return;
      }

      try {
        await restoreWorkspaceScope();
        const fs = await createTauriWorkspaceFs();
        setProjects(await listWorkspaceProjects(root, fs));
        setWorkspaceRootState(root);
        setLoadError(null);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Workspace konnte nicht gelesen werden.";
        console.error("[LocalWorkspace] refresh failed:", err);
        setWorkspaceRootState(root);
        setProjects([]);
        setLoadError(message);
      }
    } finally {
      setIsLoading(false);
      setHydrated(true);
    }
  }, [desktop]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setRoot = useCallback(
    async (path: string) => {
      const trimmed = path.trim();
      if (!trimmed) return;
      setWorkspaceRootState(trimmed);
      await refresh();
    },
    [refresh],
  );

  const chooseWorkspaceFolder = useCallback(async () => {
    const picked = await pickWorkspaceFolder();
    if (!picked) return null;
    await setRoot(picked);
    return picked;
  }, [setRoot]);

  const rememberRecent = useCallback(async (dirPath: string) => {
    await pushRecentProjectPath(dirPath);
    setRecentPaths(await getRecentProjectPaths());
  }, []);

  const value = useMemo(
    () => ({
      workspaceRoot,
      projects,
      recentPaths,
      isReady: hydrated && !isLoading && Boolean(workspaceRoot) && !loadError,
      isLoading,
      loadError,
      refresh,
      chooseWorkspaceFolder,
      setRoot,
      rememberRecent,
    }),
    [
      workspaceRoot,
      projects,
      recentPaths,
      hydrated,
      isLoading,
      loadError,
      refresh,
      chooseWorkspaceFolder,
      setRoot,
      rememberRecent,
    ],
  );

  return (
    <LocalWorkspaceContext.Provider value={value}>
      {children}
    </LocalWorkspaceContext.Provider>
  );
}

export function useLocalWorkspaceOptional(): LocalWorkspaceValue | null {
  return useContext(LocalWorkspaceContext);
}

export function useLocalWorkspace(): LocalWorkspaceValue {
  const ctx = useLocalWorkspaceOptional();
  if (!ctx) {
    throw new Error(
      "useLocalWorkspace must be used inside LocalWorkspaceProvider",
    );
  }
  return ctx;
}
