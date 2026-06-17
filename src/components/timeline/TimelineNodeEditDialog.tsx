/**
 * Timeline lane editor — title, description, duplicate & delete (DropdownView parity).
 * Location: src/components/timeline/TimelineNodeEditDialog.tsx
 *
 * Used instead of a 3-dot dropdown on narrow lane clips (click conflicts in VET).
 */

import type { ReactNode } from "react";
import { Copy, Info, Link2, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { SceneImageUploadField } from "./SceneImageUploadField";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

export interface TimelineNodeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dialogTitle: string;
  titleLabel?: string;
  title: string;
  description: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  showDescription?: boolean;
  showInfo?: boolean;
  onInfo?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  /** e.g. open ShotCard from shot lane */
  extraActionLabel?: string;
  onExtraAction?: () => void;
  /** Audio / Hörspiel: scene cover in this dialog */
  showSceneImage?: boolean;
  sceneImageUrl?: string;
  sceneImageUploading?: boolean;
  onSceneImageSelected?: (file: File) => void;
  /** Scene/shot ↔ audio lane link block */
  audioLaneLinkSection?: ReactNode;
  showAudioLaneLinkButton?: boolean;
  audioLaneLinkDisabled?: boolean;
  audioLaneLinkDisabledHint?: string;
  onLinkAudioLane?: () => void;
}

export function TimelineNodeEditDialog({
  open,
  onOpenChange,
  dialogTitle,
  titleLabel = "Title",
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  onSave,
  onCancel,
  showDescription = true,
  showInfo = false,
  onInfo,
  onDuplicate,
  onDelete,
  extraActionLabel,
  onExtraAction,
  showSceneImage = false,
  sceneImageUrl,
  sceneImageUploading = false,
  onSceneImageSelected,
  audioLaneLinkSection,
  showAudioLaneLinkButton = false,
  audioLaneLinkDisabled = false,
  audioLaneLinkDisabledHint,
  onLinkAudioLane,
}: TimelineNodeEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timeline-node-edit-title">{titleLabel}</Label>
            <Input
              id="timeline-node-edit-title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Title..."
              autoFocus
            />
          </div>
          {showDescription ? (
            <div className="space-y-2">
              <Label htmlFor="timeline-node-edit-description">
                Description
              </Label>
              <Textarea
                id="timeline-node-edit-description"
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                rows={6}
                placeholder="Description..."
              />
            </div>
          ) : null}
          {showSceneImage && onSceneImageSelected ? (
            <SceneImageUploadField
              imageUrl={sceneImageUrl}
              isUploading={sceneImageUploading}
              onFileSelected={onSceneImageSelected}
              label="Szenenbild"
            />
          ) : null}
          {audioLaneLinkSection}
        </div>
        <DialogFooter className="flex-col gap-3 sm:flex-col sm:space-x-0">
          <div className="flex flex-wrap gap-2 w-full">
            {onDelete ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="gap-1.5"
                onClick={onDelete}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            ) : null}
            {onDuplicate ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5"
                onClick={onDuplicate}
              >
                <Copy className="size-3.5" />
                Duplicate
              </Button>
            ) : null}
            {showAudioLaneLinkButton && onLinkAudioLane ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5"
                disabled={audioLaneLinkDisabled}
                title={
                  audioLaneLinkDisabled ? audioLaneLinkDisabledHint : undefined
                }
                onClick={onLinkAudioLane}
              >
                <Link2 className="size-3.5" />
                Link
              </Button>
            ) : null}
            {showInfo && onInfo ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={onInfo}
              >
                <Info className="size-3.5" />
                Informationen
              </Button>
            ) : null}
            {extraActionLabel && onExtraAction ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onExtraAction}
              >
                {extraActionLabel}
              </Button>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 w-full">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={onSave}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
