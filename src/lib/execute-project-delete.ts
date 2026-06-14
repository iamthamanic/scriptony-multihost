/**
 * Validates delete confirmation and runs projectsApi.delete.
 * Location: src/lib/execute-project-delete.ts
 */

import { projectsApi } from "@/utils/api";
import {
  LOCAL_PROJECT_DELETE_CONFIRMATION_PHRASE,
  isLocalDeleteConfirmationValid,
  localDeleteConfirmationErrorMessage,
} from "@/lib/local-project-delete-confirmation";
import {
  projectDeleteRequiresCloudPassword,
  type ProjectDeletePolicyInput,
} from "@/lib/project-delete-policy";
import { verifyCloudAccountPassword } from "@/lib/auth/verify-cloud-account-password";
import type { RuntimeConfig } from "@/runtime/runtime-config";

export async function executeProjectDelete(
  projectId: string,
  project: ProjectDeletePolicyInput | null | undefined,
  confirmValue: string,
  runtime?: RuntimeConfig | null,
): Promise<void> {
  if (projectDeleteRequiresCloudPassword(project)) {
    await verifyCloudAccountPassword(confirmValue, runtime);
    await projectsApi.delete(
      projectId,
      LOCAL_PROJECT_DELETE_CONFIRMATION_PHRASE,
    );
    return;
  }

  if (!isLocalDeleteConfirmationValid(confirmValue)) {
    throw new Error(localDeleteConfirmationErrorMessage());
  }

  await projectsApi.delete(projectId, confirmValue);
}
