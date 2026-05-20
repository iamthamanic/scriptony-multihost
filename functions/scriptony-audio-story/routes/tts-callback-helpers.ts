/**
 * TTS-Callback helpers — Pagination + Ripple-Data-Loading.
 *
 * T31: Separated from tts-callback.ts to keep file under 500 lines.
 */

import { Query, type Databases } from "node-appwrite";

export async function fetchAllProjectDocuments(
  databases: Databases,
  dbId: string,
  collectionId: string,
  projectId: string,
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  const limit = 100;
  let offset = 0;
  while (true) {
    const response = await databases.listDocuments(dbId, collectionId, [
      Query.equal("project_id", projectId),
      Query.limit(limit),
      Query.offset(offset),
    ]);
    all.push(...response.documents);
    if (response.documents.length < limit) break;
    offset += limit;
  }
  return all;
}
