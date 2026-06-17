/**
 * Validation asset ref helpers for style profile specs.
 * Location: src/lib/style-profile/validation-assets.ts
 */

import type { StyleProfileSpec } from "@/lib/types/style-profile";
import { patchSection } from "./section-params";
import { getMachineStringArray } from "./section-params";
import { buildStorageFileViewUrl } from "@/lib/stage-storage-url";
import { getProjectImagesBucketId } from "./preview-url";
import { isProjectAssetRelativePath } from "@/lib/local-asset-display-url";

export function readValidationAssetRefs(spec: StyleProfileSpec): string[] {
  const va = spec.visualSpec.validationAssets;
  const fromExample = va.exampleRefs ?? [];
  if (fromExample.length > 0) return [...fromExample];
  return getMachineStringArray(va, "assetRefs");
}

export function patchValidationAssetRef(
  spec: StyleProfileSpec,
  slotIndex: number,
  ref: string,
): StyleProfileSpec {
  const va = spec.visualSpec.validationAssets;
  const refs = readValidationAssetRefs(spec);
  while (refs.length <= slotIndex) {
    refs.push("");
  }
  refs[slotIndex] = ref;

  return {
    ...spec,
    visualSpec: {
      ...spec.visualSpec,
      validationAssets: patchSection(va, {
        exampleRefs: refs,
        machineParams: {
          ...(va.machineParams ?? {}),
          assetRefs: refs,
        },
      }),
    },
  };
}

/** Resolve stored ref (assets/…, file id, or URL) for display. */
export function resolveValidationAssetDisplayUrl(ref: string): string {
  if (!ref.trim()) return "";
  if (
    ref.startsWith("http://") ||
    ref.startsWith("https://") ||
    ref.startsWith("blob:") ||
    ref.startsWith("data:")
  ) {
    return ref;
  }
  if (isProjectAssetRelativePath(ref)) {
    return ref;
  }
  return buildStorageFileViewUrl(getProjectImagesBucketId(), ref) ?? ref;
}
