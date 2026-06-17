/**
 * Overview tab for style profile editor.
 * Location: src/components/projects/styles/tabs/StyleProfileOverviewTab.tsx
 */

import { useRef } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { Textarea } from "../../../ui/textarea";
import { Badge } from "../../../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/select";
import type { StyleProfile } from "@/lib/api/style-profile-api";
import {
  useActiveStyleProfileId,
  useStyleProfileMutations,
} from "@/hooks/useProjectStyleProfiles";
import { usesCloudHttpForDomain } from "@/lib/api-adapter/domain-access";

interface StyleProfileOverviewTabProps {
  projectId: string;
  profileId: string;
  profile: StyleProfile;
  readOnly?: boolean;
  onNameChange: (name: string) => void;
  onOpenBuilder?: () => void;
}

export function StyleProfileOverviewTab({
  projectId,
  profileId,
  profile,
  readOnly,
  onNameChange,
  onOpenBuilder,
}: StyleProfileOverviewTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importMutation, setActiveMutation, uploadPreviewMutation } =
    useStyleProfileMutations(projectId);
  const { data: activeId } = useActiveStyleProfileId(projectId);
  const isActive = profile.isActiveForProject || profile.id === activeId;
  const canUploadPreview =
    !readOnly &&
    (usesCloudHttpForDomain() || Boolean(profile.sync?.cloudId?.trim()));

  const handlePreviewPick = () => {
    fileInputRef.current?.click();
  };

  const handlePreviewFile = (file: File | undefined) => {
    if (!file) return;
    uploadPreviewMutation.mutate({ profileId, file });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          Tags, Farbpalette, Slider und Do/Avoid-Chips findest du im Tab{" "}
          <strong>Style Builder</strong>.
        </p>
        {onOpenBuilder && (
          <Button type="button" size="sm" onClick={onOpenBuilder}>
            Zum Style Builder
          </Button>
        )}
      </div>
      {isActive && (
        <Badge className="bg-primary text-primary-foreground">
          Aktives Projekt-Style
        </Badge>
      )}

      <div className="space-y-2">
        <Label>Vorschaubild</Label>
        <div className="flex items-start gap-4">
          <div className="size-24 rounded-lg border bg-muted/30 overflow-hidden flex items-center justify-center shrink-0">
            {profile.previewUrl ? (
              <img
                src={profile.previewUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <ImagePlus className="size-8 text-muted-foreground" aria-hidden />
            )}
          </div>
          {canUploadPreview && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  handlePreviewFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadPreviewMutation.isPending}
                onClick={handlePreviewPick}
              >
                {uploadPreviewMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : (
                  <ImagePlus className="size-4 mr-2" />
                )}
                Bild hochladen
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Name</Label>
        <Input
          value={profile.name}
          disabled={readOnly}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Typ</Label>
          <Select value={profile.type} disabled>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={profile.type}>{profile.type}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={profile.status} disabled>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={profile.status}>{profile.status}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Style-Zusammenfassung</Label>
        <Textarea
          rows={4}
          disabled
          value={profile.configSummary.styleSummary ?? ""}
          placeholder="Wird beim Speichern aus den Sektionen abgeleitet"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {!isActive && (
          <Button
            type="button"
            variant="outline"
            disabled={readOnly || setActiveMutation.isPending}
            onClick={() => setActiveMutation.mutate(profile.id)}
          >
            Als aktives Projekt-Style setzen
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={readOnly || importMutation.isPending}
          onClick={() => importMutation.mutate(profile.id)}
        >
          Aus Style Guide importieren
        </Button>
      </div>
    </div>
  );
}
