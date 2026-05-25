/**
 * AppwriteAssetRepository — cloud image uploads + Asset API stubs (T39).
 */

import type {
  Asset,
  AssetRepository,
  ImageUploadGifMode,
  ImportAssetInput,
} from "../ScriptonyBackend";
import {
  uploadProjectImage,
  uploadWorldImage,
} from "@/lib/api/image-upload-api";
import type { ImageUploadGifMode as LibImageUploadGifMode } from "@/lib/api/image-upload-api";

export class AppwriteAssetRepository implements AssetRepository {
  async importAsset(_input: ImportAssetInput): Promise<Asset> {
    throw new Error(
      "Use uploadProjectImage/uploadWorldImage for cloud assets, or enable local mode.",
    );
  }

  async list(_projectId: string): Promise<Asset[]> {
    throw new Error(
      "Cloud generic asset list is not implemented; use uploadProjectImage/uploadWorldImage.",
    );
  }

  async get(_id: string): Promise<Asset | null> {
    throw new Error(
      `Cloud generic asset get is not implemented (id=${_id}).`,
    );
  }

  async delete(_id: string): Promise<void> {
    throw new Error("Cloud asset delete not implemented in AppwriteAssetRepository.");
  }

  async resolveUrl(asset: Asset): Promise<string | null> {
    if (asset.storage.mode === "external") return asset.storage.url;
    if (asset.storage.mode === "appwrite") {
      return null;
    }
    return null;
  }

  async uploadProjectImage(
    projectId: string,
    file: File,
    options?: { gifMode?: ImageUploadGifMode },
  ): Promise<{ imageUrl: string }> {
    const imageUrl = await uploadProjectImage(
      projectId,
      file,
      options as { gifMode?: LibImageUploadGifMode },
    );
    return { imageUrl };
  }

  async uploadWorldImage(
    worldId: string,
    file: File,
    options?: { gifMode?: ImageUploadGifMode },
  ): Promise<{ imageUrl: string }> {
    const imageUrl = await uploadWorldImage(
      worldId,
      file,
      options as { gifMode?: LibImageUploadGifMode },
    );
    return { imageUrl };
  }
}
