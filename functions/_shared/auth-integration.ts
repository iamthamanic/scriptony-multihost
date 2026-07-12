import { createHash } from "crypto";
import type { AuthUser } from "./auth";
import { requestGraphql } from "./graphql-compat";

export function hashIntegrationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function resolveIntegrationToken(
  token: string,
): Promise<AuthUser | null> {
  if (!token || token.length < 16) {
    return null;
  }
  const tokenHash = hashIntegrationToken(token);
  try {
    const data = await requestGraphql<{
      user_integration_tokens: Array<{ user_id: string }>;
    }>(
      `
        query GetUserByIntegrationToken($tokenHash: String!) {
          user_integration_tokens(
            where: { token_hash: { _eq: $tokenHash } }
            limit: 1
          ) {
            user_id
          }
        }
      `,
      { tokenHash },
    );
    const row = data?.user_integration_tokens?.[0];
    if (!row?.user_id) {
      return null;
    }
    const profile = await requestGraphql<{
      users_by_pk: {
        id: string;
        name: string | null;
        email: string | null;
        avatar_url: string | null;
      } | null;
    }>(
      `
        query GetUserProfile($userId: uuid!) {
          users_by_pk(id: $userId) {
            id
            name
            email
            avatar_url
          }
        }
      `,
      { userId: row.user_id },
    );
    const u = profile?.users_by_pk;
    if (!u) {
      return null;
    }
    return {
      id: u.id,
      displayName: u.name ?? undefined,
      email: u.email ?? undefined,
      avatarUrl: u.avatar_url ?? undefined,
    };
  } catch (err) {
    console.error("[auth-integration] resolveIntegrationToken failed:", err);
    return null;
  }
}
