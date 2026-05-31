/**
 * Hybrid Storage Repository — Cloud-Storage, Fallback auf Stub.
 *
 * SOLID: Separater Wrapper um Storage-Calls.
 * DRY: Nutzt existierende apiClient-GET/POST-Logik.
 *
 * Location: src/backend/hybrid/HybridStorageRepository.ts
 */

import type {
  StorageRepository,
  StorageProviderConfig,
  StorageContainer,
  StorageFile,
  StorageFileInfo,
  StorageUsageInfo,
  StorageBucketKind,
} from "../ScriptonyBackend";
import { tryCloudCall } from "./cloud-proxy";
import { StubStorageRepository } from "../appwrite/stubs";

export class HybridStorageRepository implements StorageRepository {
  constructor(
    private readonly fallback: StorageRepository = new StubStorageRepository(),
    private readonly localFileSaver?: (
      file: File,
      containerId: string,
    ) => Promise<StorageFileInfo>,
  ) {}

  async listProviders(): Promise<StorageProviderConfig[]> {
    const result = await tryCloudCall<{ providers: StorageProviderConfig[] }>({
      method: "GET",
      route: "/storage/providers",
    });
    if (result.ok) return result.data.providers ?? [];
    return this.fallback.listProviders();
  }

  async getProviderMeta(providerId: string): Promise<StorageProviderConfig | null> {
    const result = await tryCloudCall<StorageProviderConfig>({
      method: "GET",
      route: `/storage/providers/${providerId}`,
    });
    if (result.ok) return result.data;
    return this.fallback.getProviderMeta(providerId);
  }

  async getDefaultProviderId(): Promise<string | null> {
    const result = await tryCloudCall<{ defaultProviderId: string }>({
      method: "GET",
      route: "/storage/providers/default",
    });
    if (result.ok) return result.data.defaultProviderId ?? null;
    return this.fallback.getDefaultProviderId();
  }

  async getSelectedProviderId(): Promise<string | null> {
    const result = await tryCloudCall<{ selectedProviderId: string }>({
      method: "GET",
      route: "/storage/providers/selected",
    });
    if (result.ok) return result.data.selectedProviderId ?? null;
    return this.fallback.getSelectedProviderId();
  }

  async setSelectedProviderId(id: string): Promise<void> {
    const result = await tryCloudCall<void>({
      method: "POST",
      route: "/storage/providers/selected",
      body: { id },
    });
    if (result.ok) return;
    return this.fallback.setSelectedProviderId(id);
  }

  async listContainers(
    providerId: string,
    bucket: StorageBucketKind,
  ): Promise<StorageContainer[]> {
    const result = await tryCloudCall<{ containers: StorageContainer[] }>({
      method: "GET",
      route: `/storage/providers/${providerId}/containers?bucket=${bucket}`,
    });
    if (result.ok) return result.data.containers ?? [];
    return this.fallback.listContainers(providerId, bucket);
  }

  async listFiles(providerId: string, containerId: string): Promise<StorageFile[]> {
    const result = await tryCloudCall<{ files: StorageFile[] }>({
      method: "GET",
      route: `/storage/providers/${providerId}/containers/${containerId}/files`,
    });
    if (result.ok) return result.data.files ?? [];
    return this.fallback.listFiles(providerId, containerId);
  }

  async uploadFile(
    providerId: string,
    containerId: string,
    file: File,
  ): Promise<StorageFileInfo> {
    /* Cloud multipart upload via apiClient ist nicht trivial;
       für KISS: Fallback auf lokale Speicherung oder Stub */
    if (this.localFileSaver) {
      return this.localFileSaver(file, containerId);
    }
    return this.fallback.uploadFile(providerId, containerId, file);
  }

  async deleteFile(providerId: string, fileId: string): Promise<void> {
    const result = await tryCloudCall<void>({
      method: "DELETE",
      route: `/storage/providers/${providerId}/files/${fileId}`,
    });
    if (result.ok) return;
    return this.fallback.deleteFile(providerId, fileId);
  }

  async getUsage(providerId: string): Promise<StorageUsageInfo> {
    const result = await tryCloudCall<StorageUsageInfo>({
      method: "GET",
      route: `/storage/providers/${providerId}/usage`,
    });
    if (result.ok) return result.data;
    return this.fallback.getUsage(providerId);
  }
}
