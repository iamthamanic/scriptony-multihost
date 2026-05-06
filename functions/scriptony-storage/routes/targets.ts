/**
 * Storage-Targets CRUD.
 * GET /storage/targets/:ownerType/:ownerId, POST /storage/targets
 *
 * TODO-T21.1: owner_type "organization" und "project" erfordern Access-Helper
 * aus scriptony-collaboration. Bis dahin: user-type only enforced.
 */

import { Hono } from "hono";
import { Query, ID } from "node-appwrite";
import type { Databases } from "node-appwrite";
import { targetSchema } from "../services/providers";
import { getRequiredEnv } from "../../_shared/env";

const app = new Hono();

async function verifyConnectionOwnership(
  db: Databases,
  connectionId: string,
  userId: string,
): Promise<
  | { ok: true }
  | { ok: false; code: 404 | 403; message: string }
> {
  try {
    const conn = await db.getDocument(
      getRequiredEnv("APPWRITE_DATABASE_ID"),
      "storage_connections",
      connectionId,
    );
    if (conn.user_id !== userId) {
      return { ok: false, code: 403, message: "Connection does not belong to you" };
    }
    return { ok: true };
  } catch {
    return { ok: false, code: 404, message: "Connection not found" };
  }
}

app.get("/:ownerType/:ownerId", async (c) => {
  const userId = c.get("userId");
  const ownerType = c.req.param("ownerType");
  const ownerId = c.req.param("ownerId");
  const db = c.get("db");

  // Owner-verification: user-type only fully enforced.
  // TODO-T21.1: org/project access checks via scriptony-collaboration API.
  if (ownerType === "user" && ownerId !== userId) {
    return c.json(
      { success: false, error: { code: "FORBIDDEN", message: "Not your target" } },
      403,
    );
  }

  const docs = await db.listDocuments(
    getRequiredEnv("APPWRITE_DATABASE_ID"),
    "storage_targets",
    [Query.equal("owner_type", ownerType), Query.equal("owner_id", ownerId)],
  );
  return c.json({ success: true, data: docs.documents });
});

app.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const parsed = targetSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
      400,
    );
  }

  if (parsed.data.owner_type === "user" && parsed.data.owner_id !== userId) {
    return c.json(
      { success: false, error: { code: "FORBIDDEN", message: "Cannot set target for another user" } },
      403,
    );
  }

  const db = c.get("db");

  // Verify connection exists and belongs to user
  const connCheck = await verifyConnectionOwnership(db, parsed.data.connection_id, userId);
  if (!connCheck.ok) {
    return c.json(
      {
        success: false,
        error: {
          code: connCheck.code === 404 ? "NOT_FOUND" : "FORBIDDEN",
          message: connCheck.message,
        },
      },
      connCheck.code,
    );
  }

  const doc = await db.createDocument(
    getRequiredEnv("APPWRITE_DATABASE_ID"),
    "storage_targets",
    ID.unique(),
    {
      ...parsed.data,
      created_by: userId,
      created_at: new Date().toISOString(),
    },
  );
  return c.json({ success: true, data: { id: doc.$id } }, 201);
});

export default app;
