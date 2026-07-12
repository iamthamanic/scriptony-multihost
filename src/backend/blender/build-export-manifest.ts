/**
 * Pure manifest builder for Blender export package (T42).
 */

export interface BlenderExportManifest {
  schemaVersion: number;
  projectId: string;
  projectName: string;
  exportedAt: string;
  source: "local" | "cloud";
  structurePath: string;
  charactersPath: string;
  assetsDir: string;
}

export function buildExportManifest(input: {
  projectId: string;
  projectName: string;
  source: "local" | "cloud";
}): BlenderExportManifest {
  return {
    schemaVersion: 1,
    projectId: input.projectId,
    projectName: input.projectName,
    exportedAt: new Date().toISOString(),
    source: input.source,
    structurePath: "structure.json",
    charactersPath: "characters.json",
    assetsDir: "assets",
  };
}
