/**
 * AppwriteAssetRepository
 *
 * Nutzt existierendes image-upload-api.ts.
 * T35: Kein duplizierter HTTP-Code.
 */

import type { AssetRepository, ImageUploadGifMode } from "../ScriptonyBackend";
import {
	uploadProjectImage,
	uploadWorldImage,
} from "@/lib/api/image-upload-api";
import type { ImageUploadGifMode as LibImageUploadGifMode } from "@/lib/api/image-upload-api";

export class AppwriteAssetRepository implements AssetRepository {
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
