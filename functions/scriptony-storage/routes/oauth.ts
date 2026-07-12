/**
 * OAuth authorize + callback für Storage-Provider.
 * Migriert von functions/scriptony-auth/storage-providers/oauth/
 */

import { Hono } from "hono";
import { PROVIDERS } from "../services/providers";
import { buildState, parseState } from "../services/oauth-state";
import { getOptionalEnv } from "../../_shared/env";
import { isRedirectUriAllowed } from "../../_shared/oauth-redirect";
import { getRequiredEnv } from "../../_shared/env";
import { Client, Databases, ID } from "node-appwrite";
import { authDbMiddleware } from "../middleware/auth";
import "../types"; // Hono ContextVariableMap

import { encrypt } from "../services/crypto";

const app = new Hono();

async function exchangeGoogleDriveCode(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; refresh_token?: string }> {
  const clientId = getOptionalEnv("scriptony_oauth_google_drive_client_id");
  const clientSecret = getOptionalEnv(
    "scriptony_oauth_google_drive_client_secret",
  );
  if (!clientId || !clientSecret) {
    throw new Error("Google Drive OAuth not configured");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Google token exchange failed: ${res.status} ${await res.text()}`,
    );
  }
  return (await res.json()) as { access_token: string; refresh_token?: string };
}

async function exchangeDropboxCode(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; refresh_token?: string }> {
  const appKey = getOptionalEnv("scriptony_oauth_dropbox_app_key");
  const appSecret = getOptionalEnv("scriptony_oauth_dropbox_app_secret");
  if (!appKey || !appSecret) throw new Error("Dropbox OAuth not configured");

  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " + Buffer.from(`${appKey}:${appSecret}`).toString("base64"),
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Dropbox token exchange failed: ${res.status} ${await res.text()}`,
    );
  }
  return (await res.json()) as { access_token: string; refresh_token?: string };
}

// GET /storage/oauth/authorize — requires auth (called by frontend)
app.use("/authorize", authDbMiddleware);
app.get("/authorize", (c) => {
  const provider = c.req.query("provider");
  const redirectUri = c.req.query("redirect_uri");
  const userId = c.get("userId");

  if (!provider || !redirectUri) {
    return c.json(
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Missing provider or redirect_uri",
        },
      },
      400,
    );
  }

  const cfg = PROVIDERS[provider];
  if (!cfg) {
    return c.json(
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: `Unknown provider: ${provider}`,
        },
      },
      400,
    );
  }

  const clientId = getOptionalEnv(cfg.clientIdEnv);
  if (!clientId) {
    return c.json(
      {
        success: false,
        error: {
          code: "NOT_CONFIGURED",
          message: "OAuth not configured for this provider",
        },
      },
      503,
    );
  }

  const callbackUrl = getOptionalEnv("scriptony_oauth_callback_url");
  if (!callbackUrl) {
    return c.json(
      {
        success: false,
        error: {
          code: "NOT_CONFIGURED",
          message: "OAuth callback URL is not set",
        },
      },
      503,
    );
  }

  const state = buildState(redirectUri, provider, userId);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    state,
    ...(cfg.scope ? { scope: cfg.scope } : {}),
    ...(cfg.extraParams || {}),
  });

  return c.redirect(`${cfg.authUrl}?${params.toString()}`, 302);
});

// GET /storage/oauth/callback — no auth (called by provider)
app.get("/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const errorParam = c.req.query("error");

  if (errorParam) {
    return c.json(
      { success: false, error: { code: "OAUTH_ERROR", message: errorParam } },
      400,
    );
  }
  if (!code || !state) {
    return c.json(
      {
        success: false,
        error: { code: "BAD_REQUEST", message: "Missing code or state" },
      },
      400,
    );
  }

  const statePayload = parseState(state);
  if (!statePayload?.redirect_uri) {
    return c.json(
      {
        success: false,
        error: { code: "BAD_REQUEST", message: "Invalid state" },
      },
      400,
    );
  }

  if (!isRedirectUriAllowed(statePayload.redirect_uri)) {
    return c.json(
      {
        success: false,
        error: { code: "BAD_REQUEST", message: "Invalid redirect_uri" },
      },
      400,
    );
  }

  const callbackUrl = getOptionalEnv("scriptony_oauth_callback_url");
  if (!callbackUrl) {
    return c.json(
      {
        success: false,
        error: {
          code: "NOT_CONFIGURED",
          message: "OAuth callback URL is not set",
        },
      },
      503,
    );
  }

  try {
    let tokens: { access_token: string; refresh_token?: string };
    switch (statePayload.provider) {
      case "google_drive":
        tokens = await exchangeGoogleDriveCode(code, callbackUrl);
        break;
      case "dropbox":
        tokens = await exchangeDropboxCode(code, callbackUrl);
        break;
      default:
        return c.json(
          {
            success: false,
            error: {
              code: "NOT_IMPLEMENTED",
              message: `OAuth for ${statePayload.provider} not implemented yet`,
            },
          },
          501,
        );
    }

    // Store connection in DB (server-side only — tokens never sent to browser)
    const dbClient = new Client()
      .setEndpoint(getRequiredEnv("APPWRITE_ENDPOINT"))
      .setProject(getRequiredEnv("APPWRITE_PROJECT_ID"))
      .setKey(getRequiredEnv("APPWRITE_API_KEY"));
    const db = new Databases(dbClient);

    const doc = await db.createDocument(
      getRequiredEnv("APPWRITE_DATABASE_ID"),
      "storage_connections",
      ID.unique(),
      {
        user_id: statePayload.user_id,
        provider: statePayload.provider,
        access_token_ciphertext: encrypt(tokens.access_token),
        refresh_token_ciphertext: tokens.refresh_token
          ? encrypt(tokens.refresh_token)
          : null,
        created_at: new Date().toISOString(),
      },
    );

    // Redirect browser with connection_id only (no tokens in fragment)
    const hash = new URLSearchParams({
      storage_oauth: "success",
      provider: statePayload.provider,
      connection_id: doc.$id,
    }).toString();

    const targetUrl = statePayload.redirect_uri.includes("#")
      ? `${statePayload.redirect_uri}&${hash}`
      : `${statePayload.redirect_uri}#${hash}`;

    return c.redirect(targetUrl, 302);
  } catch (err) {
    console.error("[storage/oauth/callback]", err);
    return c.json(
      {
        success: false,
        error: {
          code: "TOKEN_EXCHANGE_FAILED",
          message: "Token exchange failed",
        },
      },
      500,
    );
  }
});

export default app;
