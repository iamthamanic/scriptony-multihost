/**
 * Builder footer status: id, last saved, dirty, cloud sync (Step 3).
 * Location: src/components/projects/styles/StyleProfileBuilderStatusBar.tsx
 */

import { CloudUpload, Loader2 } from "lucide-react";
import { Button } from "../../ui/button";
import type { StyleProfile } from "@/lib/types/style-profile";

function formatSavedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

interface StyleProfileBuilderStatusBarProps {
  profile: StyleProfile;
  isDirty: boolean;
  pendingSyncCount?: number;
  conflictCount?: number;
  syncing?: boolean;
  onSyncAll?: () => void;
}

export function StyleProfileBuilderStatusBar({
  profile,
  isDirty,
  pendingSyncCount = 0,
  conflictCount = 0,
  syncing,
  onSyncAll,
}: StyleProfileBuilderStatusBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono">{profile.id}</span>
        <span>Zuletzt: {formatSavedAt(profile.updatedAt)}</span>
        {profile.sync.status !== "local" && (
          <span>Sync: {profile.sync.status}</span>
        )}
        {pendingSyncCount > 0 && (
          <span className="text-amber-600 dark:text-amber-400">
            {pendingSyncCount} ausstehend
          </span>
        )}
        {conflictCount > 0 && (
          <span className="text-red-600 dark:text-red-400">
            {conflictCount} Konflikt(e)
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onSyncAll && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={syncing}
            onClick={onSyncAll}
          >
            {syncing ? (
              <Loader2 className="size-3.5 animate-spin mr-1" />
            ) : (
              <CloudUpload className="size-3.5 mr-1" />
            )}
            Cloud Sync
          </Button>
        )}
        <span
          className={
            isDirty ? "text-amber-600 dark:text-amber-400" : "text-primary"
          }
        >
          {isDirty ? "● Ungespeichert" : "● Gespeichert"}
        </span>
      </div>
    </div>
  );
}
