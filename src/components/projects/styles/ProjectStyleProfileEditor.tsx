/**
 * Style profile editor shell.
 * Location: src/components/projects/styles/ProjectStyleProfileEditor.tsx
 */

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../../ui/button";
import { useStyleProfileEditor } from "@/hooks/useStyleProfileEditor";
import { useStyleProfileMutations } from "@/hooks/useProjectStyleProfiles";
import type { VisualSpecSectionKey } from "@/lib/types/style-profile";
import { confirmDiscardUnsavedStyleChanges } from "@/lib/style-profile/confirm-discard";
import { CloudSpecLimitedBanner } from "./CloudSpecLimitedBanner";
import { StyleProfileEditorHeader } from "./StyleProfileEditorHeader";
import { StyleProfileEditorToolbar } from "./StyleProfileEditorToolbar";
import { StyleProfileEditorTabs } from "./StyleProfileEditorTabs";
import { useStyleProfileAnalysis } from "@/hooks/useStyleProfileAnalysis";
import { useStyleProfileSync } from "@/hooks/useStyleProfileSync";
import { StyleProfileConflictBanner } from "./StyleProfileConflictBanner";

interface ProjectStyleProfileEditorProps {
  projectId: string;
  profileId: string;
  onBack: () => void;
  /** Referenzen/Regeln live in Style Guide tab — omit duplicate editor tabs */
  inlineGuideTabs?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onProfileSelect?: (profileId: string) => void;
  onRequestCreateProfile?: () => void;
}

export function ProjectStyleProfileEditor({
  projectId,
  profileId,
  onBack,
  inlineGuideTabs,
  onDirtyChange,
  onProfileSelect,
  onRequestCreateProfile,
}: ProjectStyleProfileEditorProps) {
  const [activeSection, setActiveSection] =
    useState<VisualSpecSectionKey>("styleDna");
  const [tab, setTab] = useState("builder");
  const { exportMutation } = useStyleProfileMutations(projectId);
  const {
    profile,
    isLoading,
    isError,
    isFetched,
    loadError,
    isDirty,
    isSaving,
    setSpec,
    setName,
    discard,
    save,
  } = useStyleProfileEditor(projectId, profileId);

  const readOnly = profile?.fullSpecEditing === false;
  const { scores, assetChecks, analyzing, analyze } = useStyleProfileAnalysis(
    profile?.spec,
    profileId,
  );
  const { pendingCount, conflictCount, syncing, syncAll } =
    useStyleProfileSync(projectId);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleBack = () => {
    if (isDirty && !confirmDiscardUnsavedStyleChanges()) return;
    if (isDirty) discard();
    onBack();
  };

  const handleProfileSelect = (nextId: string) => {
    if (nextId === profileId) return;
    if (isDirty && !confirmDiscardUnsavedStyleChanges()) return;
    if (isDirty) discard();
    onProfileSelect?.(nextId);
  };

  const updateSection = (
    key: VisualSpecSectionKey,
    next: import("@/lib/types/style-profile").StyleSectionState,
  ) => {
    if (!profile) return;
    setSpec({
      ...profile.spec,
      visualSpec: { ...profile.spec.visualSpec, [key]: next },
    });
  };

  if (isLoading && !profile) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isFetched && (isError || !profile)) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-sm text-destructive">
          {loadError instanceof Error
            ? loadError.message
            : "Style Profile nicht gefunden."}
        </p>
        <Button variant="outline" size="sm" onClick={onBack}>
          Zurück zur Liste
        </Button>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="space-y-4">
      <StyleProfileEditorToolbar
        name={profile.name}
        isActive={profile.isActiveForProject}
        isDirty={isDirty}
        isSaving={isSaving}
        onBack={handleBack}
        onDiscard={discard}
        onSave={save}
      />
      {readOnly && <CloudSpecLimitedBanner />}
      {profile.sync.status === "conflict" && (
        <StyleProfileConflictBanner
          projectId={projectId}
          profileId={profileId}
        />
      )}
      <StyleProfileEditorHeader profile={profile} />
      <StyleProfileEditorTabs
        projectId={projectId}
        profileId={profileId}
        profile={profile}
        tab={tab}
        onTabChange={setTab}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        readOnly={readOnly}
        onNameChange={setName}
        onSpecChange={setSpec}
        onSectionUpdate={updateSection}
        exportData={exportMutation.data ?? null}
        exportLoading={exportMutation.isPending}
        onExport={() => exportMutation.mutate(profileId)}
        inlineGuideTabs={inlineGuideTabs}
        isDirty={isDirty}
        onProfileSelect={handleProfileSelect}
        onNewProfile={() => onRequestCreateProfile?.()}
        onCompareTab={() => setTab("compare")}
        analysisScores={scores}
        analysisAssetChecks={assetChecks}
        analyzing={analyzing}
        onAnalyzeStyle={() => void analyze()}
        onSyncAll={syncAll}
        pendingSyncCount={pendingCount}
        conflictCount={conflictCount}
        syncing={syncing}
      />
    </div>
  );
}
