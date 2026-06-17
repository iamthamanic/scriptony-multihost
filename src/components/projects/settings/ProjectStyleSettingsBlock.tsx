/**
 * Style settings block: active profile + sync (T100).
 * Location: src/components/projects/settings/ProjectStyleSettingsBlock.tsx
 */

import { Loader2, RefreshCw } from "lucide-react";
import {
  useActiveStyleProfileId,
  useProjectStyleProfiles,
  useSetActiveStyleProfile,
} from "@/hooks/useProjectStyleProfiles";
import { useStyleProfileSync } from "@/hooks/useStyleProfileSync";
import { useProjectSync } from "@/hooks/useProjectSync";
import { StyleProfileConflictBanner } from "../styles/StyleProfileConflictBanner";
import { StyleProfileOverrideSelect } from "../styles/StyleProfileOverrideSelect";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";

interface ProjectStyleSettingsBlockProps {
  projectId: string;
  onOpenProfile?: (profileId: string) => void;
}

export function ProjectStyleSettingsBlock({
  projectId,
  onOpenProfile,
}: ProjectStyleSettingsBlockProps) {
  const { data: profiles = [] } = useProjectStyleProfiles(projectId);
  const { data: activeId } = useActiveStyleProfileId(projectId);
  const setActive = useSetActiveStyleProfile(projectId);
  const styleSync = useStyleProfileSync(projectId);
  const projectSync = useProjectSync(projectId);

  const conflictProfiles = profiles.filter((p) => p.sync.status === "conflict");

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">Style</h3>
      <StyleProfileOverrideSelect
        projectId={projectId}
        label="Aktives Profil"
        value={activeId ?? null}
        onChange={(id) => setActive.mutate(id)}
      />
      <div className="flex flex-wrap items-center gap-2">
        {styleSync.pendingCount > 0 ? (
          <Badge variant="secondary">{styleSync.pendingCount} ausstehend</Badge>
        ) : null}
        {styleSync.conflictCount > 0 ? (
          <Badge variant="outline" className="border-amber-500/50">
            {styleSync.conflictCount} Konflikt(e)
          </Badge>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={projectSync.syncing}
          onClick={() => projectSync.syncAll()}
        >
          {projectSync.syncing ? (
            <Loader2 className="size-3.5 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5 mr-1" />
          )}
          Alles synchronisieren
        </Button>
      </div>
      {projectSync.lastResult ? (
        <p className="text-xs text-muted-foreground">
          Zuletzt: {projectSync.lastResult.totals.synced} sync ·{" "}
          {projectSync.lastResult.totals.conflicts} Konflikte ·{" "}
          {projectSync.lastResult.totals.failed} fehlgeschlagen
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        v1 synchronisiert Style-Profile und aktives Profil. Timeline-Shot-Styles
        und Charaktere folgen in einem späteren Ticket.
      </p>
      {conflictProfiles.map((profile) => (
        <div key={profile.id} className="space-y-2">
          <StyleProfileConflictBanner
            projectId={projectId}
            profileId={profile.id}
          />
          {onOpenProfile ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0"
              onClick={() => onOpenProfile(profile.id)}
            >
              Profil „{profile.name}“ öffnen
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
