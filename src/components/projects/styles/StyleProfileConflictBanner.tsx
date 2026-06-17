/**
 * Banner when a style profile has sync conflict (T86).
 * Location: src/components/projects/styles/StyleProfileConflictBanner.tsx
 */

import { AlertTriangle, CloudDownload, Upload } from "lucide-react";
import { Button } from "../../ui/button";
import { useStyleProfileConflictResolve } from "@/hooks/useStyleProfileConflictResolve";

interface StyleProfileConflictBannerProps {
  projectId: string;
  profileId: string;
}

export function StyleProfileConflictBanner({
  projectId,
  profileId,
}: StyleProfileConflictBannerProps) {
  const resolve = useStyleProfileConflictResolve(projectId);

  return (
    <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 flex flex-wrap items-center gap-3">
      <div className="flex items-start gap-2 flex-1 min-w-[200px]">
        <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm">
          Sync-Konflikt: Lokale und Cloud-Version haben sich divergiert. Wähle,
          welche Version gelten soll.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={resolve.isPending}
          onClick={() => resolve.mutate({ profileId, resolution: "cloud" })}
        >
          <CloudDownload className="size-3.5 mr-1" />
          Cloud übernehmen
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={resolve.isPending}
          onClick={() => resolve.mutate({ profileId, resolution: "local" })}
        >
          <Upload className="size-3.5 mr-1" />
          Lokal behalten
        </Button>
      </div>
    </div>
  );
}
