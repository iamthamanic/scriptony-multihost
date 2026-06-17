/**
 * Per-shot puppet freshness + render jobs (Stage 3D Puppetlayer tab).
 * Location: src/components/stage/StageShotPuppetLayer.tsx
 */
import { RenderJobPanel } from "../RenderJobPanel";
import { useFreshnessLocal } from "@/hooks/useFreshness";
import type { Shot } from "@/lib/types";
import { Badge } from "../ui/badge";

const FRESHNESS_LABELS: Record<string, { label: string; className: string }> = {
  fresh: { label: "Aktuell", className: "bg-green-100 text-green-700" },
  stale: { label: "Veraltet", className: "bg-orange-100 text-orange-700" },
  unknown: { label: "Unbekannt", className: "bg-gray-100 text-gray-500" },
};

export interface StageShotPuppetLayerProps {
  shot: Shot | null;
  shotId: string;
}

export function StageShotPuppetLayer({
  shot,
  shotId,
}: StageShotPuppetLayerProps) {
  const freshness = useFreshnessLocal(shot ?? undefined);

  return (
    <div className="space-y-3 rounded-md border border-[#3b355a] bg-[#221f35]/95 p-3">
      <h3 className="text-sm font-medium text-[#c7c0de]">Aktueller Shot</h3>

      <div className="space-y-1.5">
        <h4 className="text-[11px] font-medium text-[#8a83a3] uppercase tracking-wide">
          Daten-Frische
        </h4>
        {freshness.overall === "unknown" ? (
          <p className="text-[11px] text-[#6b6480]">
            Keine Puppet-Layer-Daten (Blender-Sync ausstehend)
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "guidesStale", label: "Guides" },
                { key: "renderStale", label: "Render" },
                { key: "previewStale", label: "Preview" },
              ] as const
            ).map((r) => {
              const status = freshness[r.key];
              const cfg = FRESHNESS_LABELS[status];
              return (
                <Badge
                  key={r.key}
                  className={`text-[10px] px-1.5 py-0 ${cfg.className}`}
                >
                  {r.label}: {cfg.label}
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      <RenderJobPanel shotId={shotId} />
    </div>
  );
}
