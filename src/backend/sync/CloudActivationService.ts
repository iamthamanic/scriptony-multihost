/**
 * CloudActivationService — enable per-project cloud sync (T40).
 */

import type { AuthClient } from "@/lib/auth/AuthClient";
import type { ProjectSyncMeta } from "@/local/project-manifest";
import type { LocalProjectContext } from "../local/LocalProjectContext";
import type { AppwriteBackend } from "../appwrite/AppwriteBackend";
import { AppwriteBackend as AppwriteBackendClass } from "../appwrite/AppwriteBackend";
import { createAuthFactory } from "@/lib/auth/createAuthFactory";
import { detectRuntime } from "@/runtime/detect-runtime";
import {
  CloudLoginRequiredError,
  CloudSyncAlreadyActiveError,
} from "./errors";
import { uploadInitialSnapshot } from "./InitialSnapshotUploader";

export class CloudActivationService {
  constructor(
    private readonly local: LocalProjectContext,
    private readonly cloudAuth?: AuthClient,
    private readonly cloudBackend?: AppwriteBackend,
  ) {}

  private resolveCloud(): { auth: AuthClient; backend: AppwriteBackend } {
    if (this.cloudBackend && this.cloudAuth) {
      return { auth: this.cloudAuth, backend: this.cloudBackend };
    }
    const runtime = detectRuntime();
    const cloudRuntime = { ...runtime, profile: "cloud" as const };
    const auth = this.cloudAuth ?? createAuthFactory(cloudRuntime);
    const backend =
      this.cloudBackend ?? new AppwriteBackendClass(auth);
    return { auth, backend };
  }

  async activateCloudSync(): Promise<ProjectSyncMeta> {
    if (this.local.manifest.sync.enabled) {
      throw new CloudSyncAlreadyActiveError();
    }

    const { auth, backend: cloud } = this.resolveCloud();
    const session = await auth.getSession();
    const apiToken = await auth.getAccessToken();
    if (!session?.userId || !apiToken) {
      throw new CloudLoginRequiredError();
    }

    this.local.manifest.sync = {
      ...this.local.manifest.sync,
      enabled: false,
      syncStatus: "pendingActivation",
      lastError: undefined,
    };
    await this.local.persist();

    let cloudProjectId: string | undefined;
    let snapshotStarted = false;

    try {
      const cloudProject = await cloud.projects.create({
        name: this.local.manifest.title,
        description: this.local.manifest.description,
        projectType: "film",
      });

      cloudProjectId = cloudProject.$id;
      this.local.manifest.sync = {
        ...this.local.manifest.sync,
        cloudProjectId,
      };
      await this.local.persist();

      snapshotStarted = true;
      const snapshot = await uploadInitialSnapshot(
        this.local,
        cloud,
        cloudProjectId,
      );

      const now = new Date().toISOString();
      this.local.manifest.sync = {
        enabled: true,
        syncStatus: "active",
        provider: "scriptony-cloud",
        cloudProjectId,
        lastSyncedAt: now,
        lastError:
          snapshot.warnings.length > 0
            ? snapshot.warnings.join("; ")
            : undefined,
      };
      this.local.manifest.storageMode = "hybrid";
      await this.local.persist();

      return { ...this.local.manifest.sync };
    } catch (err) {
      if (cloudProjectId && !snapshotStarted) {
        try {
          await cloud.projects.delete(cloudProjectId);
          cloudProjectId = undefined;
        } catch (cleanupErr) {
          console.warn(
            "[CloudActivationService] Failed to delete orphaned cloud project:",
            cleanupErr,
          );
        }
      }
      // Recoverable partial state: cloud project exists but snapshot incomplete — retry allowed.
      this.local.manifest.sync = {
        ...this.local.manifest.sync,
        enabled: false,
        syncStatus:
          cloudProjectId && snapshotStarted ? "pendingActivation" : "error",
        cloudProjectId,
        lastError: err instanceof Error ? err.message : String(err),
      };
      await this.local.persist();
      throw err;
    }
  }
}
