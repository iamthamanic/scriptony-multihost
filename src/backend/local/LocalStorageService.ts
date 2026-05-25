/**
 * LocalStorageService — copy files into .scriptony/assets/ (T39).
 */

export type LocalAssetFolderType = "image" | "audio" | "video" | "document" | "other";

export interface CopiedAssetFile {
  relativePath: string;
  filename: string;
  mimeType: string | null;
  sizeBytes: number;
  originalFilename: string;
}

const TYPE_TO_SUBDIR: Record<LocalAssetFolderType, string> = {
  image: "assets/images",
  audio: "assets/audio",
  video: "assets/video",
  document: "assets/documents",
  other: "assets/documents",
};

function sanitizeFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  return base.length > 0 ? base : "asset.bin";
}

export class LocalStorageService {
  constructor(private readonly projectDir: string) {}

  async copyIntoProjectAssets(
    file: File,
    type: LocalAssetFolderType,
  ): Promise<CopiedAssetFile> {
    const subdir = TYPE_TO_SUBDIR[type];
    const originalFilename = file.name || "upload.bin";
    const safeName = sanitizeFilename(originalFilename);
    const { exists, mkdir, writeFile } = await import("@tauri-apps/plugin-fs");

    const targetDir = `${this.projectDir}/${subdir}`;
    if (!(await exists(targetDir))) {
      await mkdir(targetDir, { recursive: true });
    }

    let filename = safeName;
    let relativePath = `${subdir}/${filename}`;
    let destPath = `${this.projectDir}/${relativePath}`;
    let attempt = 0;
    while (await exists(destPath)) {
      attempt += 1;
      const dot = safeName.lastIndexOf(".");
      if (dot > 0) {
        filename = `${safeName.slice(0, dot)}_${attempt + 1}${safeName.slice(dot)}`;
      } else {
        filename = `${safeName}_${attempt + 1}`;
      }
      relativePath = `${subdir}/${filename}`;
      destPath = `${this.projectDir}/${relativePath}`;
    }

    const buffer = await file.arrayBuffer();
    await writeFile(destPath, new Uint8Array(buffer));

    return {
      relativePath,
      filename,
      mimeType: file.type || null,
      sizeBytes: file.size,
      originalFilename,
    };
  }
}
