/**
 * Removes Scriptony cloud DB data for a user before Appwrite account deletion.
 * Location: functions/_shared/user-cloud-purge.ts
 */

import { Query } from "node-appwrite";
import {
  C,
  deleteDocument,
  getDocument,
  listDocumentsFull,
  updateDocument,
} from "./appwrite-db";

const PURGE_PAGE_LIMIT = 500;

export type UserCloudPurgeResult = {
  projectsSoftDeleted: number;
  integrationTokensDeleted: number;
  organizationMembershipsDeleted: number;
  userRowDeleted: boolean;
};

async function purgeCollectionByUserId(
  collection: string,
  userId: string,
  mode: "delete" | "softDeleteProject",
): Promise<number> {
  const rows = await listDocumentsFull(
    collection,
    [Query.equal("user_id", userId)],
    PURGE_PAGE_LIMIT,
  );
  let count = 0;
  for (const row of rows) {
    const id = row.id as string;
    if (!id) continue;
    if (mode === "softDeleteProject") {
      if (row.is_deleted === true) continue;
      await updateDocument(C.projects, id, { is_deleted: true });
    } else {
      await deleteDocument(collection, id);
    }
    count++;
  }
  return count;
}

/** Soft-delete owned projects and remove user-linked rows from Appwrite DB. */
export async function purgeUserCloudData(
  userId: string,
): Promise<UserCloudPurgeResult> {
  const projectsSoftDeleted = await purgeCollectionByUserId(
    C.projects,
    userId,
    "softDeleteProject",
  );
  const integrationTokensDeleted = await purgeCollectionByUserId(
    C.user_integration_tokens,
    userId,
    "delete",
  );
  const organizationMembershipsDeleted = await purgeCollectionByUserId(
    C.organization_members,
    userId,
    "delete",
  );

  let userRowDeleted = false;
  const userRow = await getDocument(C.users, userId);
  if (userRow) {
    await deleteDocument(C.users, userId);
    userRowDeleted = true;
  }

  return {
    projectsSoftDeleted,
    integrationTokensDeleted,
    organizationMembershipsDeleted,
    userRowDeleted,
  };
}
