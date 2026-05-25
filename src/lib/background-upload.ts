/**
 * Fire-and-forget background image upload manager.
 *
 * Uploads continue even when the initiating component unmounts.
 * Progress/completion is communicated via sonner toasts and an optional callback.
 */

import { toast } from "sonner";
import {
  uploadProjectImage,
  uploadWorldImage,
  type ClientImageUploadPrepOptions,
} from "./api/image-upload-api";
import { detectRuntime } from "@/runtime/detect-runtime";
import { getBackendInstance } from "@/backend/backend-instance";

type UploadTarget =
  | { kind: "project-cover"; projectId: string }
  | { kind: "world-cover"; worldId: string };

interface BackgroundUploadOptions {
  file: File;
  target: UploadTarget;
  prepOptions?: ClientImageUploadPrepOptions;
  /** Called with the resulting URL when the upload succeeds (if component is still mounted). */
  onSuccess?: (imageUrl: string) => void;
  /** After upload finishes (success or error); not called when aborted. */
  onSettled?: () => void;
}

const activeUploads = new Map<string, AbortController>();

function uploadKey(target: UploadTarget): string {
  return target.kind === "project-cover"
    ? `project-cover:${target.projectId}`
    : `world-cover:${target.worldId}`;
}

export function isBackgroundUploadActive(target: UploadTarget): boolean {
  return activeUploads.has(uploadKey(target));
}

export function startBackgroundUpload(options: BackgroundUploadOptions): void {
  const { file, target, prepOptions, onSuccess, onSettled } = options;
  const key = uploadKey(target);

  // Cancel any existing upload for the same target
  activeUploads.get(key)?.abort();

  const controller = new AbortController();
  activeUploads.set(key, controller);

  const toastId = toast.loading("Bild wird im Hintergrund hochgeladen…");

  (async () => {
    try {
      let imageUrl: string;

      const runtime = detectRuntime();
      const backend = getBackendInstance();

      if (runtime.profile === "local" && backend) {
        if (target.kind === "project-cover") {
          const result = await backend.assets.uploadProjectImage(
            target.projectId,
            file,
            prepOptions as { gifMode?: "keep" | "convert" | "strip" },
          );
          imageUrl = result.imageUrl;
        } else {
          throw new Error(
            "Welt-Bild-Upload ist im lokalen Modus noch nicht verfügbar.",
          );
        }
      } else if (target.kind === "project-cover") {
        imageUrl = await uploadProjectImage(
          target.projectId,
          file,
          prepOptions,
        );
      } else {
        imageUrl = await uploadWorldImage(target.worldId, file, prepOptions);
      }

      if (controller.signal.aborted) return;

      toast.success("Bild erfolgreich hochgeladen!", { id: toastId });
      onSuccess?.(imageUrl);
      if (!controller.signal.aborted) onSettled?.();
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error("[background-upload] Failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Fehler beim Hochladen",
        { id: toastId },
      );
      onSettled?.();
    } finally {
      activeUploads.delete(key);
    }
  })();
}
