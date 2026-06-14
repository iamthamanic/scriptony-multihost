/**
 * When project delete requires cloud password vs typed "delete" (local-only).
 * Location: src/lib/project-delete-policy.ts
 */

export type ProjectDeleteConfirmationMode = "phrase" | "password";

export type ProjectDeletePolicyInput = {
  cloudSyncEnabled?: boolean;
};

export function getProjectDeleteConfirmationMode(
  project: ProjectDeletePolicyInput | null | undefined,
): ProjectDeleteConfirmationMode {
  return project?.cloudSyncEnabled === true ? "password" : "phrase";
}

export function projectDeleteRequiresCloudPassword(
  project: ProjectDeletePolicyInput | null | undefined,
): boolean {
  return getProjectDeleteConfirmationMode(project) === "password";
}
