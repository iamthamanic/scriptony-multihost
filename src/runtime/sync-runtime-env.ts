/**
 * Sync runtime profile into env singletons (T41/T43).
 */

import type { RuntimeConfig } from "./runtime-config";
import {
  setBackendRuntimeProfile,
  setRuntimeAppwriteOverride,
} from "@/lib/env";

export function syncRuntimeEnv(runtime: RuntimeConfig): void {
  setBackendRuntimeProfile(runtime.profile);

  if (
    runtime.profile === "selfHosted" &&
    runtime.appwriteEndpoint &&
    runtime.appwriteProjectId
  ) {
    setRuntimeAppwriteOverride({
      endpoint: runtime.appwriteEndpoint,
      projectId: runtime.appwriteProjectId,
    });
    return;
  }

  setRuntimeAppwriteOverride(null);
}
