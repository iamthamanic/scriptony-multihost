/**
 * LocalAssetRepository
 *
 * T35: Stub — gibt leeren Bild-URL zurück.
 */

import type { AssetRepository } from "../ScriptonyBackend";

export class LocalAssetRepository implements AssetRepository {
	async uploadProjectImage(): Promise<{ imageUrl: string }> {
		return { imageUrl: "" };
	}

	async uploadWorldImage(): Promise<{ imageUrl: string }> {
		return { imageUrl: "" };
	}
}
