/**
 * Cloud session (Axis 2) state for desktop local profile — hook only, no UI.
 * Location: src/hooks/useCloudLoginState.ts
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { SelfHostedConnection } from "@/backend/self-hosted";
import { SelfHostedConnectionService } from "@/backend/self-hosted/SelfHostedConnectionService";
import {
  canUseHybridFeatures,
  isLocalProfile,
} from "@/lib/api-adapter/runtime-dispatch";
import {
  type CloudAuthTarget,
  getCloudAuthTarget,
  getManagedAppwriteConfig,
  getMissingCloudAppwriteConfig,
  isCloudAuthConfigured,
  setCloudAuthTarget,
  syncCloudAuthTargetToEnv,
} from "@/lib/auth/cloud-appwrite-target";
import {
  canUseCloudSession,
  prepareCloudAuthClient,
  requestCloudPasswordReset,
  signInToCloudSession,
  signUpToCloudSession,
} from "@/lib/auth/cloud-session";
import { isDesktopShell } from "@/runtime/detect-runtime";
import { useRuntime } from "@/runtime";

export function useCloudLoginState() {
  const runtime = useRuntime();
  const shService = useMemo(() => new SelfHostedConnectionService(), []);

  const [hasSession, setHasSession] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [authTarget, setAuthTargetState] = useState<CloudAuthTarget>(() =>
    getCloudAuthTarget(),
  );
  const [activeSelfHosted, setActiveSelfHosted] =
    useState<SelfHostedConnection | null>(null);

  const visible = isDesktopShell() && isLocalProfile();
  const managedConfig = getManagedAppwriteConfig();
  const credentialsReady = isCloudAuthConfigured(authTarget);
  const refreshSelfHosted = useCallback(async () => {
    const active = await shService.getActive();
    setActiveSelfHosted(active);
  }, [shService]);

  const applyTarget = useCallback(async (target: CloudAuthTarget) => {
    setCloudAuthTarget(target);
    setAuthTargetState(target);
    await syncCloudAuthTargetToEnv();
  }, []);

  useEffect(() => {
    void (async () => {
      await refreshSelfHosted();
      await syncCloudAuthTargetToEnv();
    })();
  }, [refreshSelfHosted]);

  const refresh = useCallback(async () => {
    if (!visible) {
      setHasSession(false);
      return false;
    }
    if (!isCloudAuthConfigured()) {
      setHasSession(false);
      return false;
    }
    try {
      const ok = await canUseCloudSession(runtime);
      setHasSession(ok);
      return ok;
    } catch {
      setHasSession(false);
      return false;
    }
  }, [visible, runtime]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setAuthTarget = useCallback(
    async (target: CloudAuthTarget) => {
      await applyTarget(target);
      void refresh();
    },
    [applyTarget, refresh],
  );

  const confirmSessionAfterAuth = useCallback(async (): Promise<boolean> => {
    const ok = await refresh();
    if (!ok) {
      toast.error(
        "Anmeldung nicht bestätigt — keine Appwrite-Session erkannt (Cookies/WebView prüfen).",
      );
    }
    return ok;
  }, [refresh]);

  const openLoginDialog = useCallback(() => {
    setLoginDialogOpen(true);
  }, []);

  const closeLoginDialog = useCallback(() => {
    setLoginDialogOpen(false);
  }, []);

  const saveSelfHostedServer = useCallback(
    async (input: { name: string; endpoint: string; projectId: string }) => {
      setSubmitting(true);
      try {
        const saved = await shService.save({
          name: input.name.trim() || "Self-Host Server",
          endpoint: input.endpoint,
          projectId: input.projectId,
        });
        await shService.activate(saved.id);
        await setAuthTarget("selfHosted");
        await refreshSelfHosted();
        toast.success("Server gespeichert — du kannst dich jetzt anmelden.");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Speichern fehlgeschlagen",
        );
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [shService, setAuthTarget, refreshSelfHosted],
  );

  const testSelfHostedServer = useCallback(
    (endpoint: string, projectId: string) =>
      shService.testConnection({ endpoint, projectId }),
    [shService],
  );

  const guardCredentials = useCallback((): boolean => {
    if (credentialsReady) return true;
    toast.error("Server-Konfiguration unvollständig", {
      description: getMissingCloudAppwriteConfig(authTarget).join(", "),
    });
    return false;
  }, [credentialsReady, authTarget]);

  const signInWithCredentials = useCallback(
    async (email: string, password: string) => {
      if (!runtime || !guardCredentials()) return;
      setSubmitting(true);
      try {
        await signInToCloudSession(email, password, runtime);
        if (!(await confirmSessionAfterAuth())) return;
        setLoginDialogOpen(false);
        toast.success("Cloud angemeldet — KI, TTS und Sync verfügbar.");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Anmeldung fehlgeschlagen",
        );
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [runtime, guardCredentials, confirmSessionAfterAuth],
  );

  const signUpWithCredentials = useCallback(
    async (email: string, password: string, displayName: string) => {
      if (!runtime || !guardCredentials()) return;
      setSubmitting(true);
      try {
        await signUpToCloudSession(email, password, displayName, runtime);
        if (!(await confirmSessionAfterAuth())) return;
        setLoginDialogOpen(false);
        toast.success("Konto erstellt und angemeldet.");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Registrierung fehlgeschlagen";
        if (message.includes("bestätigen")) {
          toast.message(message);
          return;
        }
        toast.error(message);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [runtime, guardCredentials, confirmSessionAfterAuth],
  );

  const resetPassword = useCallback(
    async (email: string) => {
      if (!runtime || !guardCredentials()) return;
      setSubmitting(true);
      try {
        await requestCloudPasswordReset(email, runtime);
        toast.success("E-Mail zum Zurücksetzen wurde gesendet.");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Passwort-Reset fehlgeschlagen",
        );
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [runtime, guardCredentials],
  );

  const logout = useCallback(async () => {
    if (!runtime) return;
    setSubmitting(true);
    try {
      const client = await prepareCloudAuthClient(runtime);
      await client.signOut();
      setHasSession(false);
      toast.success("Cloud abgemeldet — lokale Projekte bleiben verfügbar.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Abmelden fehlgeschlagen",
      );
    } finally {
      setSubmitting(false);
    }
  }, [runtime]);

  return {
    visible,
    hasSession,
    busy: submitting,
    configOk: isCloudAuthConfigured(),
    missingConfig: getMissingCloudAppwriteConfig(authTarget),
    hybridReady: hasSession && canUseHybridFeatures(),
    authTarget,
    setAuthTarget,
    managedConfig,
    activeSelfHosted,
    credentialsReady,
    refresh,
    openLoginDialog,
    closeLoginDialog,
    loginDialogOpen,
    signInWithCredentials,
    signUpWithCredentials,
    resetPassword,
    saveSelfHostedServer,
    testSelfHostedServer,
    logout,
  };
}

export type CloudLoginState = ReturnType<typeof useCloudLoginState>;
