/**
 * Storage-Objects CRUD.
 * GET /storage/objects/:id, POST /storage/objects
 */

import { Hono } from "hono";
import { ID } from "node-appwrite";
import { objectSchema } from "../services/providers";
import { getRequiredEnv } from "../../_shared/env";

const app = new Hono();

app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.get("db");
  try {
    const doc = await db.getDocument(
      getRequiredEnv("APPWRITE_DATABASE_ID"),
      "storage_objects",
      id,
    );
    if (doc.created_by !== c.get("userId")) {
      return c.json(
        { success: false, error: { code: "FORBIDDEN", message: "Not your object" } },
        403,
      );
    }
    return c.json({ success: true, data: doc });
  } catch {
    return c.json(
      { success: false, error: { code: "NOT_FOUND", message: "Object not found" } },
      404,
    );
  }
});

app.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const parsed = objectSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
      400,
    );
  }

  const db = c.get("db");
  const doc = await db.createDocument(
    getRequiredEnv("APPWRITE_DATABASE_ID"),
    "storage_objects",
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
