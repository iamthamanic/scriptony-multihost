/**
 * Reusable drag-over/drop bindings for timeline image file drops.
 * Location: src/lib/timeline-image-drop-bindings.ts
 */

import type { DragEvent } from "react";
import { toast } from "sonner";
import {
  extractImageFileFromDataTransfer,
  isTimelineExternalFileDrag,
  shouldAllowTimelineFileDragOver,
} from "./timeline-image-drop";

export interface TimelineImageDropBindings {
  onDragEnter: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
}

function allowFileDrop(event: DragEvent): boolean {
  if (!shouldAllowTimelineFileDragOver(event.dataTransfer)) return false;
  event.preventDefault();
  event.stopPropagation();
  event.dataTransfer.dropEffect = "copy";
  return true;
}

export function createTimelineImageDropBindings(
  onImageFile: (file: File, event: DragEvent) => void,
): TimelineImageDropBindings {
  return {
    onDragEnter(event) {
      allowFileDrop(event);
    },
    onDragOver(event) {
      allowFileDrop(event);
    },
    onDrop(event) {
      if (!isTimelineExternalFileDrag(event.dataTransfer)) return;
      event.preventDefault();
      event.stopPropagation();
      const file = extractImageFileFromDataTransfer(event.dataTransfer);
      if (!file) {
        toast.error("Bitte ein Bild (PNG, JPG, WebP, …) ablegen.");
        return;
      }
      onImageFile(file, event);
    },
  };
}
