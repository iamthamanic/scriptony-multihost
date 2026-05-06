/**
 * scriptony-storage — Platform-Domain für Storage-Provider, Connections, Targets, Objects, Sync
 *
 * @see tickets/done-T24-implementation-storage-implementieren.md
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { createHonoAppwriteHandler } from "../_shared/hono-appwrite-handler";
import { authDbMiddleware } from "./middleware/auth";

import "./types";
import providersApp from "./routes/providers";
import oauthApp from "./routes/oauth";
import connectionsApp from "./routes/connections";
import targetsApp from "./routes/targets";
import objectsApp from "./routes/objects";
import syncApp from "./routes/sync";

const app = new Hono();

app.use("*", cors({ origin: "*" }));

// Auth + DB nur für geschützte Routen (OAuth kommt ohne Bearer-Token vom Provider)
app.use("/storage/connections/*", authDbMiddleware);
app.use("/storage/targets/*", authDbMiddleware);
app.use("/storage/objects/*", authDbMiddleware);
app.use("/storage/sync/*", authDbMiddleware);

// Routen
app.route("/storage/providers", providersApp);
app.route("/storage/oauth", oauthApp);
app.route("/storage/connections", connectionsApp);
app.route("/storage/targets", targetsApp);
app.route("/storage/objects", objectsApp);
app.route("/storage", syncApp);

app.onError((err, c) => {
  console.error("[scriptony-storage]", err);
  if (err instanceof z.ZodError) {
    return c.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: err.message } },
      400,
    );
  }
  return c.json(
    { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
    500,
  );
});

export default createHonoAppwriteHandler(app);
