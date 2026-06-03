/**
 * Cloud session state (Axis 2) for desktop local profile + hybrid UI.
 * Location: src/hooks/useCloudSession.ts
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  canUseCloudFeatures,
  isLocalProfile,
} from "@/lib/api-adapter/runtime-dispatch";
import {
  canUseCloudSession,
  getCloudAuthClient,
} from "@/lib/auth/cloud-session";
import { getMissingAppwriteConfig } from "@/lib/env";
import { isDesktopShell } from "@/runtime/detect-runtime";
import { useRuntime } from "@/runtime";

export function useCloudSession() {
  const runtime = useRuntime();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [busy, setBusy] = useState(false);

  const missingConfig = getMissingAppwriteConfig();
  const configOk = missingConfig.length === 0;
  const visible = isDesktopShell() && isLocalProfile();

  const refresh = useCallback(async () => {
    if (!visible) {
      setHasSession(false);
      setChecking(false);
      return;
    }
    if (!configOk) {
      setHasSession(false);
      setChecking(false);
      return;
    }
    setChecking(true);
    try {
      setHasSession(await canUseCloudSession(runtime));
    } finally {
      setChecking(false);
    }
  }, [visible, configOk, runtime]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async () => {
    if (!runtime) return;
    setBusy(true);
    try {
      const { initiateCloudOAuthLogin } =
        await import("@/lib/auth/cloud-session");
      await initiateCloudOAuthLogin(runtime);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Cloud-Anmeldung fehlgeschlagen",
      );
    } finally {
      setBusy(false);
    }
  }, [runtime]);

  const logout = useCallback(async () => {
    if (!runtime) return;
    setBusy(true);
    try {
      await getCloudAuthClient(runtime).signOut();
      setHasSession(false);
      toast.success("Cloud abgemeldet — lokale Projekte bleiben verfügbar.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Abmelden fehlgeschlagen",
      );
    } finally {
      setBusy(false);
    }
  }, [runtime]);

  return {
    visible,
    checking,
    hasSession,
    busy,
    configOk,
    missingConfig,
    hybridReady: hasSession && canUseCloudFeatures(),
    refresh,
    login,
    logout,
  };
}
