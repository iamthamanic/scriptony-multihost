/**
 * Appwrite Storage persistence for full StyleProfile specs (specRef).
 * Location: functions/scriptony-style/style-spec-storage.ts
 */

import { getStorageBucketId } from "../_shared/env";
import {
  deleteStorageFileById,
  downloadStorageFileJson,
  makeFileLike,
  uploadFileToStorage,
} from "../_shared/storage";
import { Buffer } from "node:buffer";

export const MAX_STYLE_PROFILE_SPEC_BYTES = 512_000;

function specBucketId(): string {
  return getStorageBucketId("general");
}

export function assertStyleProfileSpecSize(spec: unknown): void {
  const json = JSON.stringify(spec ?? {});
  const bytes = Buffer.byteLength(json, "utf8");
  if (bytes > MAX_STYLE_PROFILE_SPEC_BYTES) {
    throw new Error(`spec exceeds ${MAX_STYLE_PROFILE_SPEC_BYTES} bytes`);
  }
}

export async function storeStyleProfileSpec(
  profileId: string,
  spec: unknown,
): Promise<string> {
  assertStyleProfileSpecSize(spec);
  const content = JSON.stringify(spec ?? {});
  const fileName = `style-profile-${profileId}-${Date.now()}.json`;
  const file = makeFileLike(
    Buffer.from(content, "utf8"),
    fileName,
    "application/json",
  );
  const uploaded = await uploadFileToStorage({
    file,
    bucketId: specBucketId(),
    name: fileName,
    metadata: {
      entity: "styleProfileSpec",
      profileId,
    },
  });
  return uploaded.id;
}

export async function loadStyleProfileSpec(
  specRef: string,
): Promise<unknown | null> {
  const trimmed = specRef.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return await downloadStorageFileJson(specBucketId(), trimmed);
  } catch (error) {
    console.error("[style-spec-storage] load failed:", error);
    return null;
  }
}

export async function removeStyleProfileSpec(specRef: string): Promise<void> {
  const trimmed = specRef.trim();
  if (!trimmed) {
    return;
  }
  await deleteStorageFileById(specBucketId(), trimmed);
}
