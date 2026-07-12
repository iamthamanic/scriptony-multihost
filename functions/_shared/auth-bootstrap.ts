import type { AuthUser, BootstrapResult } from "./auth";
import { requestGraphql } from "./graphql-compat";

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "scriptony"
  );
}

/**
 * Resolve display name from AuthUser with fallback chain.
 */
function resolveDisplayName(
  user: AuthUser,
  defaultName = "Scriptony User",
): string {
  return (
    user.displayName ||
    (typeof user.metadata?.name === "string" ? user.metadata.name : "") ||
    user.email?.split("@")[0] ||
    defaultName
  );
}

export async function ensureUserBootstrap(
  user: AuthUser,
): Promise<BootstrapResult> {
  const data = await requestGraphql<{
    users_by_pk: { id: string } | null;
    organization_members: Array<{ organization_id: string }>;
  }>(
    `
      query GetExistingUserState($userId: uuid!) {
        users_by_pk(id: $userId) {
          id
        }
        organization_members(
          where: { user_id: { _eq: $userId } }
          limit: 1
        ) {
          organization_id
        }
      }
    `,
    { userId: user.id },
  );

  let organizationId = data.organization_members[0]?.organization_id || null;

  if (!organizationId) {
    const displayName = resolveDisplayName(user, "Scriptony User");

    const createdOrg = await requestGraphql<{
      insert_organizations_one: { id: string };
    }>(
      `
        mutation CreateOrganization($object: organizations_insert_input!) {
          insert_organizations_one(object: $object) {
            id
          }
        }
      `,
      {
        object: {
          name: `${displayName}'s Organization`,
          slug: `${slugify(displayName)}-${user.id.slice(0, 8)}`,
          owner_user_id: user.id,
        },
      },
    );

    organizationId = createdOrg.insert_organizations_one.id;

    await requestGraphql(
      `
        mutation AddOrganizationMember($object: organization_members_insert_input!) {
          insert_organization_members_one(object: $object) {
            organization_id
          }
        }
      `,
      {
        object: {
          organization_id: organizationId,
          user_id: user.id,
          role: "owner",
        },
      },
    );
  }

  const profileName = resolveDisplayName(user, "User");

  await requestGraphql(
    `
      mutation UpsertUser($object: users_insert_input!) {
        insert_users_one(
          object: $object
          on_conflict: {
            constraint: users_pkey
            update_columns: [display_name, email, organization_id, avatar_url]
          }
        ) {
          id
        }
      }
    `,
    {
      object: {
        id: user.id,
        display_name: profileName,
        email: user.email || null,
        avatar_url: user.avatarUrl || null,
        organization_id: organizationId,
      },
    },
  );

  return { user, organizationId };
}
