/**
 * Public Appwrite storage URLs for style profile preview images.
 * Location: src/lib/style-profile/preview-url.ts
 */

import { buildStorageFileViewUrl } from "@/lib/stage-storage-url";

const DEFAULT_PROJECT_IMAGES_BUCKET = "project-images";

export function getProjectImagesBucketId(): string {
  const v = import.meta.env.VITE_APPWRITE_STORAGE_BUCKET_PROJECT_IMAGES;
  return typeof v === "string" && v.trim()
    ? v.trim()
    : DEFAULT_PROJECT_IMAGES_BUCKET;
}

export function buildStyleProfilePreviewUrl(
  previewImageId?: string | null,
): string | null {
  if (!previewImageId?.trim()) {
    return null;
  }
  return buildStorageFileViewUrl(
    getProjectImagesBucketId(),
    previewImageId.trim(),
  );
}
