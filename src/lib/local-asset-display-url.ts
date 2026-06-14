/**
 * Resolve stored project asset paths (assets/…) to WebView URLs (Tauri convertFileSrc).
 */

import { getBackendInstance } from "@/backend/backend-instance";
import type { LocalBackend } from "@/backend/local/LocalBackend";
import { resolveSafeProjectPath } from "@/backend/local/project-path";
import { isDesktopShell } from "@/runtime/detect-runtime";
import { restoreWorkspaceScope } from "@/local/workspace";

export function isProjectAssetRelativePath(
  value: string | undefined | null,
): value is string {
  return Boolean(value && value.startsWith("assets/"));
}

function isRemoteOrBlobUrl(value: string): boolean {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:") ||
    value.startsWith("data:")
  );
}

function isTauriAssetUrl(value: string): boolean {
  return (
    value.startsWith("asset:") ||
    value.includes("asset.localhost") ||
    value.includes("/_tauri/")
  );
}

/** True for raw filesystem paths that must never be used as img src. */
export function isAbsoluteFilesystemPath(value: string): boolean {
  if (!value || value.startsWith("assets/")) return false;
  if (isRemoteOrBlobUrl(value) || isTauriAssetUrl(value)) return false;
  return value.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(value);
}

/** Extract `assets/…` from an absolute project path or return null. */
export function extractProjectAssetRelativePath(value: string): string | null {
  const normalized = value.replace(/\\/g, "/");
  if (normalized.startsWith("assets/")) return normalized;

  const marker = "/assets/";
  const idx = normalized.indexOf(marker);
  if (idx >= 0) {
    return normalized.slice(idx + 1);
  }
  return null;
}

/** Normalize scene.imageUrl for SQLite metadata — always store assets/… when possible. */
export function normalizeSceneImageStoragePath(
  value: string | undefined | null,
): string | undefined {
  if (!value) return undefined;
  if (isProjectAssetRelativePath(value)) return value;
  if (isRemoteOrBlobUrl(value) || isTauriAssetUrl(value)) return value;

  const extracted = extractProjectAssetRelativePath(value);
  if (extracted) return extracted;

  return undefined;
}

async function readProjectAssetAsBlobUrl(absPath: string): Promise<string> {
  const { readFile } = await import("@tauri-apps/plugin-fs");
  const bytes = await readFile(absPath);
  const ext = absPath.split(".").pop()?.toLowerCase();
  const mime =
    ext === "webp"
      ? "image/webp"
      : ext === "png"
        ? "image/png"
        : ext === "gif"
          ? "image/gif"
          : "image/jpeg";
  const blob = new Blob([bytes], { type: mime });
  return URL.createObjectURL(blob);
}

export async function resolveLocalProjectAssetPath(
  urlOrRelativePath: string | undefined | null,
): Promise<string> {
  if (!urlOrRelativePath) return "";

  if (isRemoteOrBlobUrl(urlOrRelativePath) || isTauriAssetUrl(urlOrRelativePath)) {
    return urlOrRelativePath;
  }

  let relativePath = urlOrRelativePath;
  if (isAbsoluteFilesystemPath(relativePath)) {
    const extracted = extractProjectAssetRelativePath(relativePath);
    if (!extracted) return "";
    relativePath = extracted;
  }

  if (!isProjectAssetRelativePath(relativePath)) return "";
  if (!isDesktopShell()) return "";

  const backend = getBackendInstance();
  if (!backend || !("localProject" in backend)) {
    return "";
  }

  const local = backend as LocalBackend;
  const abs = resolveSafeProjectPath(
    local.localProject.dirPath,
    relativePath,
  );
  if (!abs) return "";

  try {
    await restoreWorkspaceScope();
    const { convertFileSrc } = await import("@tauri-apps/api/core");
    const converted = convertFileSrc(abs);
    if (isAbsoluteFilesystemPath(converted)) {
      return await readProjectAssetAsBlobUrl(abs);
    }
    return converted;
  } catch {
    try {
      return await readProjectAssetAsBlobUrl(abs);
    } catch {
      return "";
    }
  }
}
