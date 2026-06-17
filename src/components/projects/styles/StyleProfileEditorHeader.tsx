/**
 * Style profile editor header with preview thumbnails (T79).
 * Location: src/components/projects/styles/StyleProfileEditorHeader.tsx
 */

import { Badge } from "../../ui/badge";
import type { StyleProfile } from "@/lib/types/style-profile";

const TYPE_LABELS: Record<StyleProfile["type"], string> = {
  animated_stylized: "Animated / Stylized",
  cinematic_photoreal: "Cinematic / Photoreal",
  custom: "Custom",
};

interface StyleProfileEditorHeaderProps {
  profile: StyleProfile;
  previewMode?: boolean;
}

export function StyleProfileEditorHeader({
  profile,
  previewMode,
}: StyleProfileEditorHeaderProps) {
  const summaryLine =
    profile.spec.visualSpec.styleDna.summary?.trim() ||
    profile.configSummary.styleSummary?.trim() ||
    profile.description?.trim() ||
    "Keine Kurzbeschreibung.";

  return (
    <div className="rounded-lg border bg-card/50 p-4 space-y-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold truncate">{profile.name}</h3>
            <Badge variant="outline">v{profile.version}</Badge>
            <Badge variant="secondary">{TYPE_LABELS[profile.type]}</Badge>
            {previewMode && (
              <Badge variant="outline" className="border-dashed">
                Vorschau
              </Badge>
            )}
            {profile.isActiveForProject && (
              <Badge className="bg-primary text-primary-foreground">
                Aktiv
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {summaryLine}
          </p>
          {!previewMode && (
            <p className="text-xs text-muted-foreground font-mono">
              {profile.id}
            </p>
          )}
        </div>
        {profile.previewUrl && (
          <div className="flex gap-2 shrink-0">
            <img
              src={profile.previewUrl}
              alt=""
              className="size-14 rounded-md border object-cover"
            />
          </div>
        )}
      </div>
    </div>
  );
}
