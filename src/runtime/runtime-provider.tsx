import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { RuntimeConfig } from "./runtime-config";
import type { RuntimeProfile } from "./runtime-profile";
import { detectRuntime, isDesktopShell } from "./detect-runtime";
import { resetAppwriteClient } from "@/lib/appwrite/client";
import { resetAuthClient, setAuthRuntime } from "@/lib/auth/getAuthClient";
import { resetBackendConfigCache } from "@/lib/env";
import { syncRuntimeEnv } from "./sync-runtime-env";
import {
  buildRuntimeFromConnection,
  type SelfHostedConnection,
} from "@/backend/self-hosted";
import { SelfHostedConnectionService } from "@/backend/self-hosted/SelfHostedConnectionService";
import { SelfHostedConnectionStore } from "@/backend/self-hosted/SelfHostedConnectionStore";

interface RuntimeContextValue {
  runtime: RuntimeConfig;
  setProfile: (profile: RuntimeProfile) => Promise<void>;
  activateSelfHosted: (connection: SelfHostedConnection) => void;
  clearSelfHosted: () => void;
}

const RuntimeContext = createContext<RuntimeContextValue | null>(null);

function buildCloudRuntime(): RuntimeConfig {
  const desktop = isDesktopShell();
  const fromDetect = detectRuntime();
  return {
    profile: "cloud",
    isDesktop: desktop,
    isBrowser: !desktop,
    isMobile: false,
    appwriteEndpoint: fromDetect.appwriteEndpoint,
    appwriteProjectId: fromDetect.appwriteProjectId,
  };
}

function buildLocalRuntime(): RuntimeConfig {
  const desktop = isDesktopShell();
  return {
    profile: "local",
    isDesktop: desktop,
    isBrowser: !desktop,
    isMobile: false,
  };
}

/**
 * Provides runtime config with UI-driven profile switching (T41).
 */
export function RuntimeProvider({ children }: { children: ReactNode }) {
  const [runtime, setRuntime] = useState<RuntimeConfig>(() => detectRuntime());

  useEffect(() => {
    syncRuntimeEnv(runtime);
    setAuthRuntime(runtime);
  }, [runtime]);

  useEffect(() => {
    void (async () => {
      const active = await new SelfHostedConnectionStore().getActive();
      if (active) {
        const next = buildRuntimeFromConnection(active);
        setRuntime(next);
        return;
      }
      const base = detectRuntime();
      if (base.profile !== runtime.profile) {
        setRuntime(base);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once on mount
  }, []);

  const applyRuntime = useCallback((next: RuntimeConfig) => {
    resetAppwriteClient();
    resetAuthClient();
    resetBackendConfigCache();
    syncRuntimeEnv(next);
    setAuthRuntime(next);
    setRuntime(next);
  }, []);

  const setProfile = useCallback(
    async (profile: RuntimeProfile) => {
      if (profile === "local") {
        applyRuntime(buildLocalRuntime());
        return;
      }
      if (profile === "cloud") {
        await new SelfHostedConnectionService().clearActive();
        applyRuntime(buildCloudRuntime());
        return;
      }
      if (profile === "selfHosted") {
        const active = await new SelfHostedConnectionStore().getActive();
        if (!active) {
          throw new Error(
            "Keine Self-hosted-Verbindung aktiv. Bitte zuerst einen Server verbinden.",
          );
        }
        applyRuntime(buildRuntimeFromConnection(active));
      }
    },
    [applyRuntime],
  );

  const activateSelfHosted = useCallback(
    (connection: SelfHostedConnection) => {
      applyRuntime(buildRuntimeFromConnection(connection));
    },
    [applyRuntime],
  );

  const clearSelfHosted = useCallback(() => {
    void new SelfHostedConnectionService().clearActive();
    applyRuntime(buildCloudRuntime());
  }, [applyRuntime]);

  const value = useMemo(
    () => ({
      runtime,
      setProfile,
      activateSelfHosted,
      clearSelfHosted,
    }),
    [runtime, setProfile, activateSelfHosted, clearSelfHosted],
  );

  return (
    <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>
  );
}

export function useRuntime(): RuntimeConfig {
  const ctx = useContext(RuntimeContext);
  if (!ctx) {
    throw new Error(
      "useRuntime must be used within a RuntimeProvider. Wrap <App /> with <RuntimeProvider>.",
    );
  }
  return ctx.runtime;
}

export function useRuntimeController(): RuntimeContextValue {
  const ctx = useContext(RuntimeContext);
  if (!ctx) {
    throw new Error("useRuntimeController must be used within RuntimeProvider");
  }
  return ctx;
}
