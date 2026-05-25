/**
 * CloudSyncActivateButton — enable cloud sync for an open local project (T40).
 */

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocalProject } from "@/hooks/useLocalProject";
import { useRuntime } from "@/runtime";
import { createAuthFactory } from "@/lib/auth/createAuthFactory";
import { getOAuthRedirectTarget } from "@/lib/auth/auth-redirect";
import { CloudActivationService } from "@/backend/sync/CloudActivationService";
import { CloudLoginRequiredError } from "@/backend/sync/errors";
import { AppwriteBackend } from "@/backend/appwrite/AppwriteBackend";
import { isDesktopShell } from "@/runtime/detect-runtime";

export function CloudSyncActivateButton() {
  const { project, isOpen } = useLocalProject();
  const runtime = useRuntime();
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
    return (
      <p className="text-sm text-muted-foreground">
        Cloud Sync aktiv
        {project.manifest.sync.cloudProjectId
          ? ` (${project.manifest.sync.cloudProjectId})`
          : ""}
      </p>
    );
  }

  const handleActivate = async () => {
    if (!runtime) return;
    setLoading(true);
    try {
      const cloudRuntime = { ...runtime, profile: "cloud" as const };
      const cloudAuth = createAuthFactory(cloudRuntime);
      const token = await cloudAuth.getAccessToken();
      if (!token) {
        toast.message("Bitte zuerst bei Scriptony Cloud anmelden.");
        await cloudAuth.signInWithOAuth("google", {
          redirectTo: getOAuthRedirectTarget(cloudRuntime),
        });
        return;
      }

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
      if (err instanceof CloudLoginRequiredError) {
        toast.message("Anmeldung erforderlich für Cloud Sync.");
        const cloudRuntime = { ...runtime, profile: "cloud" as const };
        const cloudAuth = createAuthFactory(cloudRuntime);
        await cloudAuth.signInWithOAuth("google", {
          redirectTo: getOAuthRedirectTarget(cloudRuntime),
        });
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
