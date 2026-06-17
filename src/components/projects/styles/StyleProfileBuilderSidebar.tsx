/**
 * Builder left sidebar: nav, profile preset, strength gauge (T79).
 * Location: src/components/projects/styles/StyleProfileBuilderSidebar.tsx
 */

import { GitCompare, Plus } from "lucide-react";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import type { StyleProfile } from "@/lib/types/style-profile";
import type { VisualSpecSectionKey } from "@/lib/types/style-profile";
import { StyleSectionNav } from "./StyleSectionNav";
import { StyleStrengthGauge } from "./StyleStrengthGauge";

interface StyleProfileBuilderSidebarProps {
  profileId: string;
  profiles: StyleProfile[];
  activeSection: VisualSpecSectionKey;
  onSectionChange: (key: VisualSpecSectionKey) => void;
  onProfileSelect: (profileId: string) => void;
  onNewProfile: () => void;
  onCompare: () => void;
  strengthScore?: number | null;
  onAnalyzeStyle?: () => void;
}

export function StyleProfileBuilderSidebar({
  profileId,
  profiles,
  activeSection,
  onSectionChange,
  onProfileSelect,
  onNewProfile,
  onCompare,
  strengthScore,
  onAnalyzeStyle,
}: StyleProfileBuilderSidebarProps) {
  const scrollToSection = (key: VisualSpecSectionKey) => {
    onSectionChange(key);
    document
      .getElementById(`style-section-${key}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Style Preset</Label>
        <Select value={profileId} onValueChange={onProfileSelect}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Profil wählen" />
          </SelectTrigger>
          <SelectContent>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-col gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNewProfile}
          >
            <Plus className="size-3.5 mr-1" />
            Neues Profil
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onCompare}>
            <GitCompare className="size-3.5 mr-1" />
            Vergleichen
          </Button>
        </div>
      </div>

      <StyleSectionNav activeKey={activeSection} onSelect={scrollToSection} />

      <StyleStrengthGauge
        score={strengthScore}
        analyzed={strengthScore != null}
        onAnalyze={onAnalyzeStyle}
      />
    </div>
  );
}
