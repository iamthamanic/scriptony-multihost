/**
 * Build RuntimeConfig for self-hosted profile (T41).
 */

import type { RuntimeConfig } from "@/runtime/runtime-config";
import { isDesktopShell } from "@/runtime/detect-runtime";
import type { SelfHostedConnection } from "./SelfHostedConnection";
import { trimEndpoint } from "./SelfHostedConnection";

export function buildRuntimeFromConnection(
  connection: SelfHostedConnection,
): RuntimeConfig {
  const desktop = isDesktopShell();
  const endpoint = trimEndpoint(connection.endpoint);
  return {
    profile: "selfHosted",
    isDesktop: desktop,
    isBrowser: !desktop,
    isMobile: false,
    appwriteEndpoint: endpoint,
    appwriteProjectId: connection.projectId,
    selfHostedEndpoint: endpoint,
  };
}
