/**
 * Inline style profiles list + editor (no route navigation).
 * Location: src/components/projects/styles/ProjectStyleProfilesPanel.tsx
 */

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  useActiveStyleProfileId,
  useProjectStyleProfiles,
  useStyleProfileMutations,
} from "@/hooks/useProjectStyleProfiles";
import { ProjectStyleProfileList } from "./ProjectStyleProfileList";
import { CreateStyleProfileDialog } from "./CreateStyleProfileDialog";
import { ProjectStyleProfileEditor } from "./ProjectStyleProfileEditor";
import { StyleProfileDefaultMode } from "./StyleProfileDefaultMode";
import type { StyleProfileTemplateId } from "@/lib/api/style-profile-api";
import { STYLE_PROFILE_TEMPLATES } from "@/lib/style-profile/reference-presets";

interface ProjectStyleProfilesPanelProps {
  projectId: string;
  selectedProfileId?: string | null;
  onSelectedProfileIdChange?: (profileId: string | null) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function ProjectStyleProfilesPanel({
  projectId,
  selectedProfileId: selectedProfileIdProp = null,
  onSelectedProfileIdChange,
  onDirtyChange,
}: ProjectStyleProfilesPanelProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [localProfileId, setLocalProfileId] = useState<string | null>(null);

  const selectedProfileId = onSelectedProfileIdChange
    ? (selectedProfileIdProp ?? null)
    : localProfileId;

  const setSelectedProfileId = (id: string | null) => {
    if (onSelectedProfileIdChange) onSelectedProfileIdChange(id);
    else setLocalProfileId(id);
  };

  const {
    data: profiles,
    isLoading,
    isError,
    error,
  } = useProjectStyleProfiles(projectId);
  const { data: activeId } = useActiveStyleProfileId(projectId);
  const {
    createMutation,
    duplicateMutation,
    deleteMutation,
    setActiveMutation,
  } = useStyleProfileMutations(projectId);

  const handleCreate = (payload: {
    name: string;
    templateId: StyleProfileTemplateId;
    setActive: boolean;
  }) => {
    createMutation.mutate(
      {
        name: payload.name,
        templateId: payload.templateId,
        setActive: payload.setActive,
      },
      {
        onSuccess: (created) => {
          setCreateOpen(false);
          setSelectedProfileId(created.id);
        },
      },
    );
  };

  const handleAdoptTemplate = (templateId: StyleProfileTemplateId) => {
    const template = STYLE_PROFILE_TEMPLATES.find((t) => t.id === templateId);
    createMutation.mutate(
      {
        name: template?.labelDe ?? "Projekt-Style",
        templateId,
        setActive: true,
      },
      {
        onSuccess: (created) => setSelectedProfileId(created.id),
      },
    );
  };

  const showDefaultMode =
    !selectedProfileId && !activeId && !isLoading && !isError;

  if (selectedProfileId) {
    return (
      <>
        <ProjectStyleProfileEditor
          projectId={projectId}
          profileId={selectedProfileId}
          inlineGuideTabs
          onDirtyChange={onDirtyChange}
          onBack={() => setSelectedProfileId(null)}
          onProfileSelect={setSelectedProfileId}
          onRequestCreateProfile={() => setCreateOpen(true)}
        />
        <CreateStyleProfileDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreate={handleCreate}
          loading={createMutation.isPending}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {isError && (
        <p className="text-sm text-destructive">
          {error instanceof Error
            ? error.message
            : "Style Profiles konnten nicht geladen werden."}
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : showDefaultMode ? (
        <StyleProfileDefaultMode
          projectId={projectId}
          existingProfiles={profiles ?? []}
          adopting={createMutation.isPending}
          onAdoptTemplate={handleAdoptTemplate}
          onActivateProfile={(id) => setActiveMutation.mutate(id)}
          onOpenProfile={setSelectedProfileId}
          onCreateCustom={() => setCreateOpen(true)}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            {profiles && profiles.length > 0 && (
              <div className="space-y-1 min-w-[12rem]">
                <Label className="text-xs text-muted-foreground">
                  Aktives Projekt-Style
                </Label>
                <Select
                  value={activeId ?? "__none__"}
                  onValueChange={(v) =>
                    setActiveMutation.mutate(v === "__none__" ? null : v)
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Keins" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Keins</SelectItem>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              className="bg-primary hover:bg-primary/90 ml-auto"
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4 mr-1" />
              Neues Profile
            </Button>
          </div>

          <ProjectStyleProfileList
            profiles={profiles ?? []}
            activeId={activeId}
            onOpen={setSelectedProfileId}
            onSetActive={(id) => setActiveMutation.mutate(id)}
            onDuplicate={(id) => duplicateMutation.mutate(id)}
            onDelete={(id) => deleteMutation.mutate(id)}
            onCreateClick={() => setCreateOpen(true)}
          />
        </>
      )}

      <CreateStyleProfileDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
        loading={createMutation.isPending}
      />
    </div>
  );
}
