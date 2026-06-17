/**
 * Patch validation asset refs in a style profile spec.
 * Location: functions/scriptony-style/style-validation-assets.ts
 */

export function patchValidationAssetRef(
  spec: Record<string, unknown>,
  slotIndex: number,
  ref: string,
): Record<string, unknown> {
  const visualSpec = (spec.visualSpec ?? {}) as Record<string, unknown>;
  const validationAssets = (visualSpec.validationAssets ?? {}) as Record<
    string,
    unknown
  >;
  const machineParams = (validationAssets.machineParams ?? {}) as Record<
    string,
    unknown
  >;

  const fromExample = Array.isArray(validationAssets.exampleRefs)
    ? [...validationAssets.exampleRefs]
    : [];
  const fromMachine = Array.isArray(machineParams.assetRefs)
    ? [...machineParams.assetRefs]
    : [];
  const refs = fromExample.length > 0 ? fromExample : fromMachine;

  while (refs.length <= slotIndex) {
    refs.push("");
  }
  refs[slotIndex] = ref;

  return {
    ...spec,
    visualSpec: {
      ...visualSpec,
      validationAssets: {
        ...validationAssets,
        status: "configured",
        exampleRefs: refs,
        machineParams: {
          ...machineParams,
          assetRefs: refs,
        },
      },
    },
  };
}

export function readValidationAssetSlotIndex(req: {
  query?: Record<string, unknown>;
  url?: string;
}): number | null {
  const fromQuery = req.query?.slotIndex ?? req.query?.slot;
  if (typeof fromQuery === "string" && fromQuery.trim()) {
    const parsed = Number(fromQuery);
    if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 15) {
      return parsed;
    }
  }
  try {
    const raw = typeof req.url === "string" ? req.url : "";
    const url =
      raw.startsWith("http://") || raw.startsWith("https://")
        ? new URL(raw)
        : new URL(raw, "http://local");
    const slot =
      url.searchParams.get("slotIndex") ?? url.searchParams.get("slot");
    if (slot) {
      const parsed = Number(slot);
      if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 15) {
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}
