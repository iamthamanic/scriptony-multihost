/**
 * Scene/shot style override hierarchy panel (Step 4).
 * Location: src/components/projects/styles/StyleProfileOverridesPanel.tsx
 */

import {
  useActiveStyleProfileId,
  useProjectStyleProfiles,
} from "@/hooks/useProjectStyleProfiles";
import { resolveEffectiveStyleProfileId } from "@/lib/style-profile/resolve-effective-profile";
import { Badge } from "../../ui/badge";

interface StyleProfileOverridesPanelProps {
  projectId: string;
  sceneOverrideId?: string | null;
  shotOverrideId?: string | null;
  shotAssignedProfileId?: string | null;
}

export function StyleProfileOverridesPanel({
  projectId,
  sceneOverrideId,
  shotOverrideId,
  shotAssignedProfileId,
}: StyleProfileOverridesPanelProps) {
  const { data: activeId } = useActiveStyleProfileId(projectId);
  const { data: profiles } = useProjectStyleProfiles(projectId);

  const effectiveId = resolveEffectiveStyleProfileId({
    activeProjectProfileId: activeId,
    sceneOverrideId,
    shotOverrideId,
    shotAssignedProfileId,
  });

  const effectiveName =
    profiles?.find((p) => p.id === effectiveId)?.name ?? "Keins";

  const rows = [
    { label: "Projekt (aktiv)", id: activeId },
    { label: "Szene Override", id: sceneOverrideId },
    { label: "Shot zugewiesen", id: shotAssignedProfileId },
    { label: "Shot Override", id: shotOverrideId },
  ];

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h4 className="text-sm font-medium">Style-Hierarchie (Step 4)</h4>
      <p className="text-xs text-muted-foreground">
        Shot Override → Szene Override → Shot-Zuweisung → Projekt-Default.
        RenderJobs nutzen{" "}
        <code className="text-[10px]">resolveStyleProfileIdForRenderJob</code>.
      </p>
      <ul className="space-y-2 text-sm">
        {rows.map((row) => (
          <li key={row.label} className="flex justify-between gap-2">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-mono text-xs truncate max-w-[50%]">
              {row.id ?? "—"}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 pt-1 border-t">
        <span className="text-sm">Effektiv:</span>
        <Badge>{effectiveName}</Badge>
      </div>
    </div>
  );
}
