/**
 * Unified Style Guide panel: profiles, legacy guide, active profile + sync.
 * Location: src/components/projects/styles/ProjectStyleGuidePanel.tsx
 */

import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Badge } from "../../ui/badge";
import { LoadingSpinner } from "../../shared/LoadingSpinner";
import { ProjectStyleProfilesPanel } from "./ProjectStyleProfilesPanel";
import { ProjectStyleSettingsBlock } from "../settings/ProjectStyleSettingsBlock";
import { confirmDiscardUnsavedStyleChanges } from "@/lib/style-profile/confirm-discard";
import { useProjectStyleProfiles } from "@/hooks/useProjectStyleProfiles";
import type { StyleGuideSectionProps } from "../../style-guide/StyleGuideSection";

const StyleGuideSection = lazy(() =>
  import("../../style-guide/StyleGuideSection").then((module) => ({
    default: module.StyleGuideSection,
  })),
);

export type StyleGuidePanelTab = "profiles" | "guide" | "active";

interface ProjectStyleGuidePanelProps extends StyleGuideSectionProps {
  initialProfileId?: string | null;
  onProfileIdChange?: (profileId: string | null) => void;
  onDirtyChange?: (dirty: boolean) => void;
  initialPanelTab?: StyleGuidePanelTab;
}

export function ProjectStyleGuidePanel({
  initialProfileId,
  onProfileIdChange,
  onDirtyChange,
  initialPanelTab,
  projectId,
  ...styleGuideProps
}: ProjectStyleGuidePanelProps) {
  const [panelTab, setPanelTab] = useState<StyleGuidePanelTab>(
    initialPanelTab ?? "profiles",
  );
  const [profileId, setProfileId] = useState<string | null>(
    initialProfileId ?? null,
  );
  const [profilesDirty, setProfilesDirty] = useState(false);
  const autoTabApplied = useRef(false);
  const { data: profiles } = useProjectStyleProfiles(projectId);
  const hasProfiles = (profiles?.length ?? 0) > 0;

  useEffect(() => {
    if (initialPanelTab) {
      setPanelTab(initialPanelTab);
    }
  }, [initialPanelTab]);

  useEffect(() => {
    if (initialProfileId) {
      setProfileId(initialProfileId);
      setPanelTab("profiles");
      autoTabApplied.current = true;
    }
  }, [initialProfileId]);

  useEffect(() => {
    if (autoTabApplied.current || !hasProfiles) return;
    setPanelTab("profiles");
    autoTabApplied.current = true;
  }, [hasProfiles]);

  useEffect(() => {
    onDirtyChange?.(profilesDirty);
  }, [profilesDirty, onDirtyChange]);

  const handleProfileChange = (id: string | null) => {
    setProfileId(id);
    onProfileIdChange?.(id);
  };

  const handlePanelTabChange = (next: string) => {
    const tab = next as StyleGuidePanelTab;
    if (
      panelTab === "profiles" &&
      tab !== "profiles" &&
      profilesDirty &&
      profileId
    ) {
      if (!confirmDiscardUnsavedStyleChanges()) return;
    }
    setPanelTab(tab);
  };

  const openProfileInBuilder = (id: string) => {
    handleProfileChange(id);
    setPanelTab("profiles");
  };

  return (
    <Tabs
      value={panelTab}
      onValueChange={handlePanelTabChange}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-3 h-auto sm:inline-flex sm:w-auto">
        <TabsTrigger value="profiles" className="gap-2">
          Profile
          {hasProfiles && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Builder
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="active">Aktiv &amp; Sync</TabsTrigger>
        <TabsTrigger value="guide">Guide (Legacy)</TabsTrigger>
      </TabsList>

      <TabsContent value="profiles" className="mt-4 focus-visible:outline-none">
        <ProjectStyleProfilesPanel
          projectId={projectId}
          selectedProfileId={profileId}
          onSelectedProfileIdChange={handleProfileChange}
          onDirtyChange={setProfilesDirty}
        />
      </TabsContent>

      <TabsContent value="active" className="mt-4 focus-visible:outline-none">
        <ProjectStyleSettingsBlock
          projectId={projectId}
          onOpenProfile={openProfileInBuilder}
        />
      </TabsContent>

      <TabsContent value="guide" className="mt-4 focus-visible:outline-none">
        <Suspense fallback={<LoadingSpinner />}>
          <StyleGuideSection projectId={projectId} {...styleGuideProps} />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}
