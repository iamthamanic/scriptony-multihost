/**
 * True when the auth profile represents a real Appwrite account (not desktop local-user).
 * Location: src/lib/auth/is-cloud-app-user.ts
 */

export function isCloudAppUser(
  user: { id: string; email?: string } | null | undefined,
): boolean {
  if (!user) return false;
  if (user.id === "local-user") return false;
  return Boolean(user.email?.trim());
}
