/**
 * Storage-Sync, Import, Export stubs.
 * POST /storage/sync, POST /storage/import, POST /storage/export
 */

import { Hono } from "hono";
import { ID } from "node-appwrite";
import { syncSchema } from "../services/providers";
import { getRequiredEnv } from "../../_shared/env";

const app = new Hono();

app.post("/sync", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.message },
      },
      400,
    );
  }

  const db = c.get("db");
  const doc = await db.createDocument(
    getRequiredEnv("APPWRITE_DATABASE_ID"),
    "storage_sync_status",
    ID.unique(),
    {
      user_id: userId,
      ...parsed.data,
      updated_at: new Date().toISOString(),
    },
  );
  return c.json({ success: true, data: { id: doc.$id } }, 201);
});

app.post("/import", async (c) => {
  return c.json(
    { success: true, data: { job_id: ID.unique(), status: "queued" } },
    202,
  );
});

app.post("/export", async (c) => {
  return c.json(
    { success: true, data: { job_id: ID.unique(), status: "queued" } },
    202,
  );
});

export default app;
