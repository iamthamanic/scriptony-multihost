/**
 * Client-side style package export (JSON bundle, T81).
 * Location: src/lib/style-profile/export-style-package.ts
 */

import type { StyleProfile } from "@/lib/types/style-profile";

export interface StylePackageManifest {
  format: "style-package-v1";
  exportedAt: string;
  profile: {
    id: string;
    name: string;
    type: StyleProfile["type"];
    version: number;
    configSummary: StyleProfile["configSummary"];
  };
  spec: StyleProfile["spec"];
}

export function buildStylePackageManifest(
  profile: StyleProfile,
): StylePackageManifest {
  return {
    format: "style-package-v1",
    exportedAt: new Date().toISOString(),
    profile: {
      id: profile.id,
      name: profile.name,
      type: profile.type,
      version: profile.version,
      configSummary: profile.configSummary,
    },
    spec: profile.spec,
  };
}

export function downloadStylePackage(profile: StyleProfile): void {
  const manifest = buildStylePackageManifest(profile);
  const blob = new Blob([JSON.stringify(manifest, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${profile.name.replace(/\s+/g, "-")}-style-package.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
