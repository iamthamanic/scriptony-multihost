/**
 * CloudSyncActivateButton — enable cloud sync for an open local project (T40).
 */

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocalProject } from "@/hooks/useLocalProject";
import { useRuntime } from "@/runtime";
import { useCloudSession } from "@/hooks/useCloudSession";
import {
  requireCapability,
  CapabilityDeniedError,
} from "@/capabilities/registry";
import { DomainAccessError } from "@/lib/api-adapter/domain-access";
import { CloudActivationService } from "@/backend/sync/CloudActivationService";
import { CloudLoginRequiredError } from "@/backend/sync/errors";
import { AppwriteBackend } from "@/backend/appwrite/AppwriteBackend";
import { getCloudAuthClient } from "@/lib/auth/cloud-session";
import { isDesktopShell } from "@/runtime/detect-runtime";

export function CloudSyncActivateButton() {
  const { project, isOpen } = useLocalProject();
  const runtime = useRuntime();
  const { login } = useCloudSession();
  const [loading, setLoading] = useState(false);

  if (
    !isDesktopShell() ||
    runtime?.profile !== "local" ||
    !isOpen ||
    !project
  ) {
    return null;
  }

  if (project.manifest.sync.enabled) {
    const { syncStatus, lastSyncedAt, cloudProjectId, lastError } =
      project.manifest.sync;
    return (
      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        <p>
          Cloud Sync:
          {syncStatus ? (
            <span className="text-foreground"> {syncStatus}</span>
          ) : (
            <span className="text-foreground"> aktiviert</span>
          )}
          {project.manifest.storageMode
            ? ` · Speicher: ${project.manifest.storageMode}`
            : ""}
        </p>
        {cloudProjectId ? (
          <p className="text-xs">Cloud-Projekt: {cloudProjectId}</p>
        ) : null}
        {lastSyncedAt ? (
          <p className="text-xs">
            Zuletzt synchronisiert: {new Date(lastSyncedAt).toLocaleString()}
          </p>
        ) : null}
        <p className="text-xs">
          Bearbeitung bleibt lokal (SQLite). Cloud-Kopie für Backup/Team.
        </p>
        {syncStatus === "error" && lastError ? (
          <p className="text-sm text-destructive">{lastError}</p>
        ) : null}
      </div>
    );
  }

  const handleActivate = async () => {
    if (!runtime) return;
    setLoading(true);
    try {
      await requireCapability("sync.project_cloud");
      const cloudAuth = getCloudAuthClient(runtime);
      const cloudBackend = new AppwriteBackend(cloudAuth);
      const service = new CloudActivationService(
        project,
        cloudAuth,
        cloudBackend,
      );
      await service.activateCloudSync();
      toast.success(
        "Cloud Sync wurde aktiviert. Eine Cloud-Kopie wurde erstellt.",
      );
    } catch (err) {
      if (
        err instanceof CloudLoginRequiredError ||
        err instanceof DomainAccessError
      ) {
        toast.message("Anmeldung erforderlich für Cloud Sync (Kopfleiste).");
        await login();
        return;
      }
      if (err instanceof CapabilityDeniedError) {
        toast.error(err.message);
        return;
      }
      toast.error(
        err instanceof Error ? err.message : "Cloud Sync fehlgeschlagen",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Das Projekt bleibt lokal. Es wird zusätzlich eine Cloud-Kopie erstellt.
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={loading}
        onClick={() => void handleActivate()}
      >
        {loading ? "Cloud Sync wird aktiviert…" : "Cloud Sync aktivieren"}
      </Button>
      {project.manifest.sync.syncStatus === "error" &&
      project.manifest.sync.lastError ? (
        <p className="text-sm text-destructive">
          {project.manifest.sync.lastError}
        </p>
      ) : null}
    </div>
  );
}
