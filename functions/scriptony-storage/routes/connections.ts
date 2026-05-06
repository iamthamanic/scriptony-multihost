/**
 * Storage-Connections CRUD.
 * GET /storage/connections, POST /storage/connections, DELETE /storage/connections/:id
 */

import { Hono } from "hono";
import { Query, ID } from "node-appwrite";
import { connectionSchema } from "../services/providers";
import { getRequiredEnv } from "../../_shared/env";

import { encrypt } from "../services/crypto";

const app = new Hono();

app.get("/", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const docs = await db.listDocuments(
    getRequiredEnv("APPWRITE_DATABASE_ID"),
    "storage_connections",
    [Query.equal("user_id", userId)],
  );
  return c.json({
    success: true,
    data: docs.documents.map((d) => ({
      id: d.$id,
      provider: d.provider,
      created_at: d.created_at,
    })),
  });
});

app.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const parsed = connectionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
      400,
    );
  }

  const db = c.get("db");
  const { provider, access_token, refresh_token } = parsed.data;
  const doc = await db.createDocument(
    getRequiredEnv("APPWRITE_DATABASE_ID"),
    "storage_connections",
    ID.unique(),
    {
      user_id: userId,
      provider,
      access_token_ciphertext: encrypt(access_token),
      refresh_token_ciphertext: refresh_token ? encrypt(refresh_token) : null,
      created_at: new Date().toISOString(),
    },
  );
  return c.json({ success: true, data: { id: doc.$id } }, 201);
});

app.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const db = c.get("db");

  try {
    const doc = await db.getDocument(
      getRequiredEnv("APPWRITE_DATABASE_ID"),
      "storage_connections",
      id,
    );
    if (doc.user_id !== userId) {
      return c.json(
        { success: false, error: { code: "FORBIDDEN", message: "Not your connection" } },
        403,
      );
    }
  } catch {
    return c.json(
      { success: false, error: { code: "NOT_FOUND", message: "Connection not found" } },
      404,
    );
  }

  await db.deleteDocument(
    getRequiredEnv("APPWRITE_DATABASE_ID"),
    "storage_connections",
    id,
  );
  return c.json({ success: true });
});

export default app;
