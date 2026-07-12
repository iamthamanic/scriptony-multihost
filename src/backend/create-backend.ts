/**
 * createBackend — Factory für ScriptonyBackend.
 */

import type { ScriptonyBackend } from "./ScriptonyBackend";
import type { RuntimeConfig } from "@/runtime/runtime-config";
import { createAuthFactory } from "@/lib/auth/createAuthFactory";
import { AppwriteBackend } from "./appwrite/AppwriteBackend";
import { LocalBackend } from "./local/LocalBackend";
import { LocalBackendNotReady } from "./local/LocalBackendNotReady";
import type { LocalProjectContext } from "./local/LocalProjectContext";

export function createBackend(
  runtime: RuntimeConfig,
  localProject?: LocalProjectContext | null,
): ScriptonyBackend {
  const auth = createAuthFactory(runtime);

  switch (runtime.profile) {
    case "local":
      if (!localProject) {
        return new LocalBackendNotReady(auth);
      }
      return new LocalBackend(auth, localProject);

    case "cloud":
    case "selfHosted":
      return new AppwriteBackend(auth);

    default:
      console.warn(
        "[createBackend] Unknown runtime profile, falling back to Appwrite:",
        (runtime as RuntimeConfig).profile,
      );
      return new AppwriteBackend(auth);
  }
}
