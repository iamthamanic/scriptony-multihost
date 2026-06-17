/**
 * Merge helpers for project metadata_json (active style profile, etc.).
 * Location: src/lib/project-metadata-merge.ts
 */

export function parseProjectMetadata(
  metaRaw: unknown,
): Record<string, unknown> {
  if (typeof metaRaw === "string" && metaRaw.trim()) {
    try {
      const parsed = JSON.parse(metaRaw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return { ...(parsed as Record<string, unknown>) };
      }
    } catch {
      return {};
    }
    return {};
  }
  if (metaRaw && typeof metaRaw === "object" && !Array.isArray(metaRaw)) {
    return { ...(metaRaw as Record<string, unknown>) };
  }
  return {};
}

export function mergeActiveStyleProfileIntoMetadata(
  metaRaw: unknown,
  profileId: string | null,
): string {
  const meta = parseProjectMetadata(metaRaw);
  if (profileId?.trim()) {
    meta.activeStyleProfileId = profileId.trim();
    delete meta.active_style_profile_id;
  } else {
    delete meta.activeStyleProfileId;
    delete meta.active_style_profile_id;
  }
  return JSON.stringify(meta);
}
