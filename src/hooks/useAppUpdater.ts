/**
 * Desktop app update state — check, download/install, relaunch.
 * Location: src/hooks/useAppUpdater.ts
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Update } from "@tauri-apps/plugin-updater";
import {
  type AppUpdateInfo,
  type AppUpdaterPhase,
  closeAvailableUpdate,
  fetchAvailableUpdate,
  installAvailableUpdate,
  isAppUpdaterAvailable,
  readInstalledAppVersion,
  restartDesktopApp,
} from "../lib/desktop/app-updater";

export function useAppUpdater() {
  const available = isAppUpdaterAvailable();
  const pendingUpdateRef = useRef<Update | null>(null);
  const [phase, setPhase] = useState<AppUpdaterPhase>("idle");
  const [installedVersion, setInstalledVersion] = useState<string | null>(null);
  const [remoteUpdate, setRemoteUpdate] = useState<AppUpdateInfo | null>(null);
  const [downloadPercent, setDownloadPercent] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!available) return;
    void readInstalledAppVersion().then(setInstalledVersion);
  }, [available]);

  const resetPendingUpdate = useCallback(async () => {
    const pending = pendingUpdateRef.current;
    pendingUpdateRef.current = null;
    if (pending) {
      try {
        await closeAvailableUpdate(pending);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const checkForUpdate = useCallback(async () => {
    if (!available) return;
    setErrorMessage(null);
    setRemoteUpdate(null);
    setDownloadPercent(null);
    setPhase("checking");
    await resetPendingUpdate();
    try {
      const result = await fetchAvailableUpdate();
      if (!result) {
        setPhase("up-to-date");
        return;
      }
      pendingUpdateRef.current = result.update;
      setRemoteUpdate(result.info);
      setPhase("available");
    } catch (error) {
      setPhase("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Update-Check fehlgeschlagen",
      );
    }
  }, [available, resetPendingUpdate]);

  const installUpdate = useCallback(async () => {
    const update = pendingUpdateRef.current;
    if (!update) return;
    setErrorMessage(null);
    setDownloadPercent(null);
    setPhase("downloading");
    let downloadedBytes = 0;
    let contentLength: number | undefined;
    try {
      await installAvailableUpdate(update, (event) => {
        if (event.event === "Started") {
          contentLength = event.data.contentLength;
          setDownloadPercent(contentLength ? 0 : null);
        }
        if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          if (contentLength && contentLength > 0) {
            setDownloadPercent(
              Math.min(
                100,
                Math.round((downloadedBytes / contentLength) * 100),
              ),
            );
          }
        }
        if (event.event === "Finished") {
          setPhase("ready");
        }
      });
      setPhase("ready");
    } catch (error) {
      setPhase("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Update-Installation fehlgeschlagen",
      );
    }
  }, []);

  const relaunchApp = useCallback(async () => {
    await restartDesktopApp();
  }, []);

  return {
    available,
    phase,
    installedVersion,
    remoteUpdate,
    downloadPercent,
    errorMessage,
    checkForUpdate,
    installUpdate,
    relaunchApp,
  };
}
