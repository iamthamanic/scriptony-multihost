/**
 * Upload validation assets to style profile slots (local + cloud).
 * Location: src/lib/style-profile/validation-asset-upload.ts
 */

import { requireLocalBackend } from "@/lib/api-adapter/runtime-dispatch";
import {
  localGetStyleProfile,
  localUpdateStyleProfile,
} from "@/lib/api-adapter/style-profiles-local";
import { usesCloudHttpForDomain } from "@/lib/api-adapter/domain-access";
import { cloudUploadStyleProfileValidationAsset } from "@/lib/api/style-profile-cloud-http";
import { normalizeSceneImageStoragePath } from "@/lib/local-asset-display-url";
import { restoreWorkspaceScope } from "@/local/workspace";
import { prepareImageFileForUpload } from "@/lib/image-upload-prep";
import {
  assertPreparedImageWithinUploadLimit,
  type ClientImageUploadPrepOptions,
} from "@/lib/api/image-upload-api";
import type { StyleProfile } from "@/lib/types/style-profile";
import {
  patchValidationAssetRef,
  readValidationAssetRefs,
} from "./validation-assets";
import { afterLocalStyleProfileSave } from "./hybrid-cloud-push";

async function localUploadValidationAsset(
  profileId: string,
  slotIndex: number,
  file: File,
  prepOptions?: ClientImageUploadPrepOptions,
): Promise<StyleProfile> {
  const backend = requireLocalBackend();
  const profile = await localGetStyleProfile(profileId);
  await restoreWorkspaceScope();

  const ready = await prepareImageFileForUpload(file, prepOptions);
  assertPreparedImageWithinUploadLimit(ready, 5);

  const asset = await backend.assets.importAsset({
    projectId: profile.projectId,
    file: ready,
    type: "image",
    originalFilename: ready.name,
  });

  const storedPath =
    asset.storage.mode === "local" ? asset.storage.relativePath : "";
  if (!storedPath) {
    throw new Error(
      "Validation-Asset konnte nicht im Projekt gespeichert werden",
    );
  }

  const normalized = normalizeSceneImageStoragePath(storedPath) ?? storedPath;
  const nextSpec = patchValidationAssetRef(profile.spec, slotIndex, normalized);
  const updated = await localUpdateStyleProfile(profileId, { spec: nextSpec });
  afterLocalStyleProfileSave(updated);
  return updated;
}

async function cloudDirectUploadValidationAsset(
  profileId: string,
  slotIndex: number,
  file: File,
  prepOptions?: ClientImageUploadPrepOptions,
): Promise<StyleProfile> {
  return cloudUploadStyleProfileValidationAsset(
    profileId,
    slotIndex,
    file,
    prepOptions,
  );
}

/** Hybrid: local file + optional cloud mirror when profile has cloudId. */
async function hybridUploadValidationAsset(
  profileId: string,
  slotIndex: number,
  file: File,
  prepOptions?: ClientImageUploadPrepOptions,
): Promise<StyleProfile> {
  const local = await localUploadValidationAsset(
    profileId,
    slotIndex,
    file,
    prepOptions,
  );
  const cloudId = local.sync.cloudId?.trim();
  if (!cloudId) {
    return local;
  }

  try {
    const cloudProfile = await cloudUploadStyleProfileValidationAsset(
      cloudId,
      slotIndex,
      file,
      prepOptions,
    );
    const cloudRefs = readValidationAssetRefs(cloudProfile.spec);
    const cloudRef = cloudRefs[slotIndex]?.trim();
    if (cloudRef && !cloudRef.startsWith("assets/")) {
      const nextSpec = patchValidationAssetRef(local.spec, slotIndex, cloudRef);
      return localUpdateStyleProfile(profileId, { spec: nextSpec });
    }
  } catch (error) {
    console.warn("[validation-asset] cloud mirror failed:", error);
  }

  return local;
}

export async function uploadStyleProfileValidationAsset(
  profileId: string,
  slotIndex: number,
  file: File,
  prepOptions?: ClientImageUploadPrepOptions,
): Promise<StyleProfile> {
  if (usesCloudHttpForDomain()) {
    return cloudDirectUploadValidationAsset(
      profileId,
      slotIndex,
      file,
      prepOptions,
    );
  }
  return hybridUploadValidationAsset(profileId, slotIndex, file, prepOptions);
}
