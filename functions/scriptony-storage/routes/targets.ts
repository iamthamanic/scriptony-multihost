/**
 * Storage-Targets CRUD.
 * GET /storage/targets/:ownerType/:ownerId, POST /storage/targets
 */

import { Hono } from "hono";
import { Query, ID } from "node-appwrite";
import { targetSchema } from "../services/providers";
import { getRequiredEnv } from "../../_shared/env";

const app = new Hono();

app.get("/:ownerType/:ownerId", async (c) => {
  const userId = c.get("userId");
  const ownerType = c.req.param("ownerType");
  const ownerId = c.req.param("ownerId");
  const db = c.get("db");

  // Owner-verification (user must own the target, or be the owner)
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
