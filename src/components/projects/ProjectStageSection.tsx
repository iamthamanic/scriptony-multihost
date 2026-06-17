/**
 * Project Stage tab — puppet-layer shot overview (T99).
 * Location: src/components/projects/ProjectStageSection.tsx
 */

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useProjectStageOverview } from "@/hooks/useProjectStageOverview";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import type { Shot } from "@/lib/types";

interface ProjectStageSectionProps {
  projectId: string;
  onOpenShot?: (shot: Shot) => void;
  onGoToStructure?: () => void;
  onGoToRenders?: () => void;
}

function StageShotRow({
  shot,
  stale,
  onOpen,
}: {
  shot: Shot;
  stale: boolean;
  onOpen?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 bg-card">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">
          Shot {shot.shotNumber || shot.id.slice(0, 8)}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          Guide rev {shot.guideBundleRevision ?? "—"} · Style rev{" "}
          {shot.styleProfileRevision ?? "—"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={
            stale
              ? "border-amber-500/60 text-amber-700 dark:text-amber-400"
              : "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
          }
        >
          {stale ? "veraltet" : "aktuell"}
        </Badge>
        {onOpen ? (
          <Button type="button" size="sm" variant="outline" onClick={onOpen}>
            Shot öffnen
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ProjectStageSection({
  projectId,
  onOpenShot,
  onGoToStructure,
  onGoToRenders,
}: ProjectStageSectionProps) {
  const { data, isLoading, isError } = useProjectStageOverview(projectId);
  const [staleOnly, setStaleOnly] = useState(false);

  const rows = useMemo(() => {
    if (!data) return [];
    return staleOnly ? data.rows.filter((row) => row.anyStale) : data.rows;
  }, [data, staleOnly]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
        <Loader2 className="size-4 animate-spin" />
        Stage-Übersicht wird geladen…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-destructive py-4">
        Stage-Übersicht konnte nicht geladen werden.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {data.total} Shots · {data.withPreview} mit Preview · {data.staleCount}{" "}
        veraltet. Übersicht der Puppet-Daten — zum Bearbeiten Stage in der
        Navbar öffnen.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="stage-stale-only"
            checked={staleOnly}
            onCheckedChange={setStaleOnly}
          />
          <Label htmlFor="stage-stale-only" className="text-sm">
            Nur veraltete
          </Label>
        </div>
        {onGoToStructure ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onGoToStructure}
          >
            Zur Struktur-Timeline
          </Button>
        ) : null}
        {onGoToRenders ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onGoToRenders}
          >
            Renders →
          </Button>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          {staleOnly
            ? "Keine veralteten Shots — alles aktuell."
            : "Noch keine Shots in diesem Projekt."}
        </p>
      ) : (
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {rows.map((row) => (
            <StageShotRow
              key={row.shot.id}
              shot={row.shot}
              stale={row.anyStale}
              onOpen={onOpenShot ? () => onOpenShot(row.shot) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
