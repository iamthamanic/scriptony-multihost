/**
 * Compare two style profiles side-by-side (T82/T90).
 * Location: src/components/projects/styles/tabs/StyleProfileCompareTab.tsx
 */

import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/select";
import { Label } from "../../../ui/label";
import { Badge } from "../../../ui/badge";
import type { StyleProfile } from "@/lib/types/style-profile";
import {
  analyzeStyleProfile,
  formatScorePercent,
} from "@/lib/style-profile/analyze-style";
import {
  diffStyleProfileSections,
  type SectionDiffRow,
} from "@/lib/style-profile/compare-style-profiles";

interface StyleProfileCompareTabProps {
  profile: StyleProfile;
  profiles: StyleProfile[];
}

const DIFF_LABELS: Record<SectionDiffRow["status"], string> = {
  same: "Gleich",
  changed: "Geändert",
  only_a: "Nur A",
  only_b: "Nur B",
};

function CompareColumn({ profile }: { profile: StyleProfile }) {
  const scores = useMemo(
    () => analyzeStyleProfile(profile.spec),
    [profile.spec],
  );
  const dna = profile.spec.visualSpec.styleDna;
  const tags = (dna.machineParams?.tags as string[] | undefined) ?? [];

  return (
    <div className="rounded-lg border p-4 space-y-3 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-medium truncate">{profile.name}</h4>
        <Badge variant="outline">{formatScorePercent(scores.overall)}</Badge>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-3">
        {dna.summary ?? profile.configSummary.styleSummary ?? "—"}
      </p>
      <div className="flex flex-wrap gap-1">
        {tags.slice(0, 6).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <span>Farbe: {formatScorePercent(scores.color)}</span>
        <span>Linie: {formatScorePercent(scores.line)}</span>
        <span>Form: {formatScorePercent(scores.shape)}</span>
        <span>Sektionen: {scores.configuredSections}/18</span>
      </div>
    </div>
  );
}

function SectionDiffList({ rows }: { rows: SectionDiffRow[] }) {
  const changed = rows.filter((r) => r.status !== "same");
  if (changed.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Alle 18 Sektionen sind identisch konfiguriert.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5 text-sm max-h-64 overflow-y-auto">
      {changed.map((row) => (
        <li
          key={row.key}
          className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5"
        >
          <span>{row.titleDe}</span>
          <Badge
            variant={row.status === "changed" ? "default" : "outline"}
            className="text-xs shrink-0"
          >
            {DIFF_LABELS[row.status]}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

export function StyleProfileCompareTab({
  profile,
  profiles,
}: StyleProfileCompareTabProps) {
  const others = profiles.filter((p) => p.id !== profile.id);
  const [compareId, setCompareId] = useState(others[0]?.id ?? "");

  const compareProfile = others.find((p) => p.id === compareId);
  const diffRows = useMemo(() => {
    if (!compareProfile) return [];
    return diffStyleProfileSections(profile.spec, compareProfile.spec);
  }, [profile.spec, compareProfile]);

  if (others.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8">
        Lege mindestens ein zweites Style Profile an, um zu vergleichen.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 max-w-xs">
        <Label>Vergleichen mit</Label>
        <Select value={compareId} onValueChange={setCompareId}>
          <SelectTrigger>
            <SelectValue placeholder="Profil wählen" />
          </SelectTrigger>
          <SelectContent>
            {others.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <CompareColumn profile={profile} />
        {compareProfile && <CompareColumn profile={compareProfile} />}
      </div>
      {compareProfile && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Sektions-Diff</h4>
          <SectionDiffList rows={diffRows} />
        </div>
      )}
    </div>
  );
}
