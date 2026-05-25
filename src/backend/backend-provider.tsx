/**
 * BackendProvider + useScriptonyBackend()
 *
 * T35/T38: Resolves AppwriteBackend or LocalBackend from runtime + open project.
 */

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { ScriptonyBackend } from "./ScriptonyBackend";
import { useRuntime } from "@/runtime";
import { useLocalProjectOptional } from "@/hooks/useLocalProject";
import { createBackend } from "./create-backend";
import { setBackendInstance } from "./backend-instance";

const BackendContext = createContext<ScriptonyBackend | null>(null);

export interface BackendProviderProps {
  children: ReactNode;
  backend?: ScriptonyBackend;
}

export function BackendProvider({ children, backend }: BackendProviderProps) {
  const runtime = useRuntime();
  const localProject = useLocalProjectOptional()?.project ?? null;

  const resolved = useMemo(() => {
    if (backend) return backend;
    if (!runtime) {
      throw new Error("BackendProvider must be nested inside RuntimeProvider");
    }
    return createBackend(runtime, localProject);
  }, [backend, runtime, localProject]);

  useEffect(() => {
    setBackendInstance(resolved);
    return () => setBackendInstance(null);
  }, [resolved]);

  return (
    <BackendContext.Provider value={resolved}>{children}</BackendContext.Provider>
  );
}

export function useScriptonyBackend(): ScriptonyBackend {
  const ctx = useContext(BackendContext);
  if (!ctx) {
    throw new Error("useScriptonyBackend must be used inside BackendProvider");
  }
  return ctx;
}
