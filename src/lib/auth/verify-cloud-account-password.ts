/**
 * Verifies the user's cloud account password without deleting the account.
 * Uses a short-lived Appwrite email/password session (same pattern as delete-account).
 *
 * Location: src/lib/auth/verify-cloud-account-password.ts
 */

import { Account, Client } from "appwrite";
import { getAppwritePublicConfig } from "@/lib/env";
import type { RuntimeConfig } from "@/runtime/runtime-config";
import { loadAccountSettingsProfile } from "./account-settings-client";
import { prepareCloudAuthClient } from "./cloud-session";

export async function verifyCloudAccountPassword(
  password: string,
  runtime?: RuntimeConfig | null,
): Promise<void> {
  const trimmed = password.trim();
  if (!trimmed) {
    throw new Error("Bitte dein Cloud-Passwort eingeben.");
  }

  const profile = await loadAccountSettingsProfile(runtime ?? null);
  const email = profile?.email?.trim();
  if (!email) {
    throw new Error(
      "Cloud-E-Mail nicht verfügbar. Bitte melde dich erneut in der Cloud an.",
    );
  }

  const authClient = await prepareCloudAuthClient(runtime ?? null);
  const jwt = await authClient.getAccessToken();
  if (!jwt) {
    throw new Error(
      "Keine aktive Cloud-Session. Bitte melde dich an, um dein Passwort zu bestätigen.",
    );
  }

  const cfg = getAppwritePublicConfig();
  if (!cfg?.endpoint || !cfg?.projectId) {
    throw new Error("Appwrite ist nicht konfiguriert.");
  }

  const client = new Client()
    .setEndpoint(cfg.endpoint.trim())
    .setProject(cfg.projectId.trim())
    .setJWT(jwt);
  const account = new Account(client);

  try {
    const probe = await account.createEmailPasswordSession({
      email,
      password: trimmed,
    });
    try {
      await account.deleteSession({ sessionId: probe.$id });
    } catch {
      /* best-effort: drop verification-only session */
    }
  } catch {
    throw new Error(
      "Passwort ist falsch oder die Cloud-Anmeldung ist ungültig.",
    );
  }
}
