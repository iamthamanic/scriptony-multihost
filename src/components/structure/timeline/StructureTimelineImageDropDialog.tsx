/**
 * Confirm dialog — create scene/shot from image drop on empty timeline lane.
 * Location: src/components/structure/timeline/StructureTimelineImageDropDialog.tsx
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Button } from "../../ui/button";

export interface StructureTimelineImageDropDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function StructureTimelineImageDropDialog({
  open,
  title,
  description,
  confirmLabel,
  isSubmitting = false,
  onConfirm,
  onCancel,
}: StructureTimelineImageDropDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && !isSubmitting && onCancel()}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Abbrechen
          </Button>
          <Button type="button" disabled={isSubmitting} onClick={onConfirm}>
            {isSubmitting ? "Wird angelegt…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
