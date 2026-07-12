/**
 * LocalAssetRepository — asset metadata in SQLite + files under assets/ (T39).
 */

import type {
  Asset,
  AssetRepository,
  AssetType,
  ImageUploadGifMode,
  ImportAssetInput,
} from "../ScriptonyBackend";
import type { LocalDb } from "./LocalDb";
import { LocalStorageService } from "./LocalStorageService";
import { TABLE } from "@/local/project-schema";
import { mapAssetRow } from "./mappers";
import { localId } from "./id";
import { isDesktopShell } from "@/runtime/detect-runtime";
import { resolveSafeProjectPath } from "./project-path";

export class LocalAssetRepository implements AssetRepository {
  constructor(
    private readonly db: LocalDb,
    private readonly projectDir: string,
    private readonly storage: LocalStorageService,
  ) {}

  async importAsset(input: ImportAssetInput): Promise<Asset> {
    const folderType =
      input.type === "image" ||
      input.type === "audio" ||
      input.type === "video" ||
      input.type === "document"
        ? input.type
        : "other";

    const copied = await this.storage.copyIntoProjectAssets(input.file, folderType);
    const now = new Date().toISOString();
    const id = localId("asset");

    const metadata = JSON.stringify({
      originalFilename: input.originalFilename ?? copied.originalFilename,
    });

    await this.db.run(
      `INSERT INTO ${TABLE.ASSETS}
        (id, project_id, asset_type, local_path, cloud_file_id, mime_type, file_size_bytes, metadata_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
      [
        id,
        input.projectId,
        input.type,
        copied.relativePath,
        copied.mimeType,
        copied.sizeBytes,
        metadata,
        now,
        now,
      ],
    );

    const asset: Asset = {
      id,
      projectId: input.projectId,
      type: input.type,
      filename: copied.filename,
      mimeType: copied.mimeType,
      sizeBytes: copied.sizeBytes,
      storage: { mode: "local", relativePath: copied.relativePath },
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insertChange({
      projectId: input.projectId,
      entityType: TABLE.ASSETS,
      entityId: id,
      operation: "create",
      payload: asset,
    });

    return asset;
  }

  async list(projectId: string): Promise<Asset[]> {
    const rows = await this.db.all(
      `SELECT * FROM ${TABLE.ASSETS} WHERE project_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
      [projectId],
    );
    const assets: Asset[] = [];
    for (const row of rows) {
      const mapped = mapAssetRow(row);
      const missing = await this.isFileMissing(mapped);
      assets.push(missing ? { ...mapped, missing: true } : mapped);
    }
    return assets;
  }

  async get(id: string): Promise<Asset | null> {
    const row = await this.db.get(
      `SELECT * FROM ${TABLE.ASSETS} WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    if (!row) return null;
    const mapped = mapAssetRow(row);
    const missing = await this.isFileMissing(mapped);
    return missing ? { ...mapped, missing: true } : mapped;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.get(id);
    if (!existing) return;

    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE ${TABLE.ASSETS} SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, id],
    );

    await this.db.insertChange({
      projectId: existing.projectId,
      entityType: TABLE.ASSETS,
      entityId: id,
      operation: "delete",
      payload: { id },
    });
  }

  async resolveUrl(asset: Asset): Promise<string | null> {
    if (asset.missing) return null;
    if (asset.storage.mode !== "local") return null;
    if (!isDesktopShell()) return null;

    const absPath = resolveSafeProjectPath(
      this.projectDir,
      asset.storage.relativePath,
    );
    if (!absPath) return null;
    try {
      const { exists } = await import("@tauri-apps/plugin-fs");
      if (!(await exists(absPath))) return null;
      const { convertFileSrc } = await import("@tauri-apps/api/core");
      return convertFileSrc(absPath);
    } catch {
      return null;
    }
  }

  async uploadProjectImage(
    projectId: string,
    file: File,
    _options?: { gifMode?: ImageUploadGifMode },
  ): Promise<{ imageUrl: string }> {
    const asset = await this.importAsset({
      projectId,
      file,
      type: "image",
    });
    const url = await this.resolveUrl(asset);
    return { imageUrl: url ?? "" };
  }

  async uploadWorldImage(
    _worldId: string,
    file: File,
    _options?: { gifMode?: ImageUploadGifMode },
  ): Promise<{ imageUrl: string }> {
    throw new Error(
      "LocalAssetRepository.uploadWorldImage requires a projectId — use importAsset with world item context (T39).",
    );
  }

  private async isFileMissing(asset: Asset): Promise<boolean> {
    if (asset.storage.mode !== "local") return false;
    try {
      const { exists } = await import("@tauri-apps/plugin-fs");
      const abs = resolveSafeProjectPath(
        this.projectDir,
        asset.storage.relativePath,
      );
      if (!abs) return true;
      return !(await exists(abs));
    } catch {
      return true;
    }
  }
}
