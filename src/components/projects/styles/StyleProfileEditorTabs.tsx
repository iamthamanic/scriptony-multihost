/**
 * Tab panels for style profile editor.
 * Location: src/components/projects/styles/StyleProfileEditorTabs.tsx
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { STYLE_SECTION_REGISTRY } from "@/lib/api/style-profile-api";
import type {
  StyleProfile,
  VisualSpecSectionKey,
} from "@/lib/types/style-profile";
import { StyleProfileBuilderLayout } from "./StyleProfileBuilderLayout";
import { StyleProfileBuilderSidebar } from "./StyleProfileBuilderSidebar";
import { StyleProfileBuilderStatusBar } from "./StyleProfileBuilderStatusBar";
import { StyleSectionCardRouter } from "./sections/StyleSectionCardRouter";
import { useProjectStyleProfiles } from "@/hooks/useProjectStyleProfiles";
import { StyleProfileOverviewTab } from "./tabs/StyleProfileOverviewTab";
import { StyleProfileReferencesTab } from "./tabs/StyleProfileReferencesTab";
import { StyleProfileRulesTab } from "./tabs/StyleProfileRulesTab";
import { StyleProfileCompareTab } from "./tabs/StyleProfileCompareTab";
import { StyleProfileValidationTab } from "./tabs/StyleProfileValidationTab";
import { StyleProfileOverridesPanel } from "./StyleProfileOverridesPanel";
import type { StyleAssetCheck } from "@/lib/style-profile/analyze-style-remote";
import type { StyleAnalysisScores } from "@/lib/style-profile/analyze-style";
import { StyleProfileToolSettingsTab } from "./tabs/StyleProfileToolSettingsTab";
import { StyleProfileJsonExport } from "./StyleProfileJsonExport";
import type { StyleProfileExport } from "@/lib/api/style-profile-api";

interface StyleProfileEditorTabsProps {
  projectId: string;
  profileId: string;
  profile: StyleProfile;
  tab: string;
  onTabChange: (tab: string) => void;
  activeSection: VisualSpecSectionKey;
  onSectionChange: (key: VisualSpecSectionKey) => void;
  readOnly?: boolean;
  onNameChange: (name: string) => void;
  onSpecChange: (spec: StyleProfile["spec"]) => void;
  onSectionUpdate: (
    key: VisualSpecSectionKey,
    next: import("@/lib/types/style-profile").StyleSectionState,
  ) => void;
  exportData: StyleProfileExport | null;
  exportLoading?: boolean;
  onExport: () => void;
  /** Hide Referenzen/Regeln — shown in sibling Style Guide tab */
  inlineGuideTabs?: boolean;
  isDirty?: boolean;
  onProfileSelect?: (profileId: string) => void;
  onNewProfile?: () => void;
  onCompareTab?: () => void;
  analysisScores?: StyleAnalysisScores | null;
  analysisAssetChecks?: StyleAssetCheck[] | null;
  analyzing?: boolean;
  onAnalyzeStyle?: () => void;
  onSyncAll?: () => void;
  pendingSyncCount?: number;
  conflictCount?: number;
  syncing?: boolean;
}

export function StyleProfileEditorTabs({
  projectId,
  profileId,
  profile,
  tab,
  onTabChange,
  activeSection,
  onSectionChange,
  readOnly,
  onNameChange,
  onSpecChange,
  onSectionUpdate,
  exportData,
  exportLoading,
  onExport,
  inlineGuideTabs,
  isDirty,
  onProfileSelect,
  onNewProfile,
  onCompareTab,
  analysisScores,
  analysisAssetChecks,
  analyzing,
  onAnalyzeStyle,
  onSyncAll,
  pendingSyncCount,
  conflictCount,
  syncing,
}: StyleProfileEditorTabsProps) {
  const { data: allProfiles } = useProjectStyleProfiles(projectId);
  const profiles = allProfiles ?? [];

  return (
    <Tabs value={tab} onValueChange={onTabChange}>
      <TabsList className="flex flex-wrap h-auto gap-1">
        <TabsTrigger value="builder" className="font-medium">
          Style Builder
        </TabsTrigger>
        <TabsTrigger value="overview">Übersicht</TabsTrigger>
        {!inlineGuideTabs && (
          <>
            <TabsTrigger value="references">Referenzen</TabsTrigger>
            <TabsTrigger value="rules">Regeln</TabsTrigger>
          </>
        )}
        <TabsTrigger value="validation">Validierung</TabsTrigger>
        <TabsTrigger value="compare">Vergleich</TabsTrigger>
        <TabsTrigger value="tools">Tool Settings</TabsTrigger>
        <TabsTrigger value="export">Export</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <StyleProfileOverviewTab
          projectId={projectId}
          profileId={profileId}
          profile={profile}
          readOnly={readOnly}
          onNameChange={onNameChange}
          onOpenBuilder={() => onTabChange("builder")}
        />
      </TabsContent>

      <TabsContent value="builder" className="mt-4">
        <p className="text-sm text-muted-foreground mb-3 rounded-md border border-dashed px-3 py-2 bg-muted/20">
          Hier bearbeitest du alle 18 Style-Sektionen mit Tags, Farbpalette,
          Slidern und Do/Avoid-Chips — wie in den Referenz-Mockups.
        </p>
        <StyleProfileBuilderLayout
          activeSection={activeSection}
          onSectionChange={onSectionChange}
          sidebar={
            <StyleProfileBuilderSidebar
              profileId={profileId}
              profiles={profiles}
              activeSection={activeSection}
              onSectionChange={onSectionChange}
              onProfileSelect={(id) => onProfileSelect?.(id)}
              onNewProfile={() => onNewProfile?.()}
              onCompare={() => {
                onCompareTab?.();
                onTabChange("compare");
              }}
              strengthScore={analysisScores?.overall}
              onAnalyzeStyle={onAnalyzeStyle}
            />
          }
          statusBar={
            <StyleProfileBuilderStatusBar
              profile={profile}
              isDirty={!!isDirty}
              pendingSyncCount={pendingSyncCount}
              conflictCount={conflictCount}
              syncing={syncing}
              onSyncAll={onSyncAll}
            />
          }
          inspector={
            <StyleProfileToolSettingsTab
              spec={profile.spec}
              profile={profile}
              readOnly={readOnly}
              onChange={onSpecChange}
            />
          }
          cards={
            <>
              {STYLE_SECTION_REGISTRY.map((section) => (
                <StyleSectionCardRouter
                  key={section.key}
                  section={section}
                  state={profile.spec.visualSpec[section.key]}
                  profileType={profile.type}
                  profileId={profileId}
                  readOnly={readOnly}
                  onChange={onSectionUpdate}
                  onValidationAssetsUploaded={(refs) => {
                    onSpecChange({
                      ...profile.spec,
                      visualSpec: {
                        ...profile.spec.visualSpec,
                        validationAssets: {
                          ...profile.spec.visualSpec.validationAssets,
                          exampleRefs: refs,
                          machineParams: {
                            ...profile.spec.visualSpec.validationAssets
                              .machineParams,
                            assetRefs: refs,
                          },
                        },
                      },
                    });
                  }}
                />
              ))}
            </>
          }
        />
      </TabsContent>

      {!inlineGuideTabs && (
        <>
          <TabsContent value="references" className="mt-4">
            <StyleProfileReferencesTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="rules" className="mt-4">
            <StyleProfileRulesTab projectId={projectId} />
          </TabsContent>
        </>
      )}

      <TabsContent value="validation" className="mt-4 space-y-6">
        <StyleProfileValidationTab
          profile={profile}
          profileId={profileId}
          scores={analysisScores ?? null}
          assetChecks={analysisAssetChecks ?? null}
          analyzing={analyzing}
          onAnalyze={onAnalyzeStyle}
          readOnly={readOnly}
          onSpecChange={onSpecChange}
        />
        <StyleProfileOverridesPanel projectId={projectId} />
      </TabsContent>

      <TabsContent value="compare" className="mt-4">
        <StyleProfileCompareTab profile={profile} profiles={profiles} />
      </TabsContent>

      <TabsContent value="tools" className="mt-4 max-w-2xl">
        <StyleProfileToolSettingsTab
          spec={profile.spec}
          profile={profile}
          readOnly={readOnly}
          onChange={onSpecChange}
        />
      </TabsContent>

      <TabsContent value="export" className="mt-4">
        <StyleProfileJsonExport
          exportData={exportData}
          loading={exportLoading}
          onExport={onExport}
        />
      </TabsContent>
    </Tabs>
  );
}
