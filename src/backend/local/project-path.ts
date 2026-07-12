/**
 * Safe resolution of paths inside a .scriptony project directory.
 */

function normalizeRelativePath(relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) return null;

  const parts: string[] = [];
  for (const segment of normalized.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") return null;
    parts.push(segment);
  }
  return parts.join("/");
}

/** Reject traversal and return absolute path under projectDir, or null if unsafe. */
export function resolveSafeProjectPath(
  projectDir: string,
  relativePath: string,
): string | null {
  const safeRelative = normalizeRelativePath(relativePath);
  if (!safeRelative) return null;

  const root = projectDir.replace(/\/$/, "");
  const abs = `${root}/${safeRelative}`;

  const rootPrefix = `${root}/`;
  if (!abs.startsWith(rootPrefix) && abs !== root) {
    return null;
  }

  const renormalized = normalizeRelativePath(abs.slice(root.length + 1));
  if (renormalized !== safeRelative) {
    return null;
  }

  return abs;
}
