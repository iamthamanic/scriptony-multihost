/**
 * MVP banner: world-level cloud sync is planned; data stays local for now.
 * Location: src/components/world/WorldbuildingCloudSyncBanner.tsx
 */

import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";
import { isDesktopShell } from "@/runtime/detect-runtime";

export function WorldbuildingCloudSyncBanner() {
  if (!isDesktopShell() || !isLocalProfile()) {
    return null;
  }

  return (
    <div
      className="mx-4 mt-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
      role="status"
    >
      <strong className="text-foreground">Welten (lokal):</strong> Worldbuilding
      wird aus dem geöffneten Projekt bzw. Workspace geladen. Cloud-Sync pro
      Welt ist geplant (analog Projekt-Sync T40) — aktuell nur lokal. Siehe{" "}
      <code className="text-xs">docs/ARCHITECTURE_LOCAL_CLOUD.md</code>.
    </div>
  );
}
