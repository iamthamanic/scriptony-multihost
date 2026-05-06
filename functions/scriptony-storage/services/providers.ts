/**
 * Storage-Provider-Konfiguration und Shared-Schemas.
 */

import { z } from "zod";

export const PROVIDERS: Record<
  string,
  {
    label: string;
    authUrl: string;
    scope: string;
    clientIdEnv: string;
    extraParams?: Record<string, string>;
  }
> = {
  google_drive: {
    label: "Google Drive",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scope: "https://www.googleapis.com/auth/drive.file",
    clientIdEnv: "scriptony_oauth_google_drive_client_id",
    extraParams: { access_type: "offline", prompt: "consent" },
  },
  dropbox: {
    label: "Dropbox",
    authUrl: "https://www.dropbox.com/oauth2/authorize",
    scope: "",
    clientIdEnv: "scriptony_oauth_dropbox_app_key",
  },
  onedrive: {
    label: "OneDrive",
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    scope: "https://graph.microsoft.com/Files.ReadWrite.AppFolder",
    clientIdEnv: "scriptony_oauth_onedrive_client_id",
    extraParams: { response_type: "code", response_mode: "query" },
  },
  kdrive: {
    label: "kDrive",
    authUrl: "https://api.infomaniak.com/oauth/authorize",
    scope: "drive",
    clientIdEnv: "scriptony_oauth_kdrive_client_id",
  },
} as const;

export const connectionSchema = z.object({
  provider: z.enum(["google_drive", "dropbox", "onedrive", "kdrive"]),
  access_token: z.string().min(1),
  refresh_token: z.string().optional(),
});

export const targetSchema = z.object({
  owner_type: z.enum(["user", "organization", "project"]),
  owner_id: z.string().min(1),
  connection_id: z.string().min(1),
  path_prefix: z.string().default("/"),
});

export const objectSchema = z.object({
  connection_id: z.string().min(1),
  target_id: z.string().min(1),
  provider_path: z.string().min(1),
  size_bytes: z.number().int().nonnegative(),
  mime_type: z.string().optional(),
  checksum: z.string().optional(),
});

export const syncSchema = z.object({
  connection_id: z.string().min(1),
  status: z.enum(["pending", "running", "completed", "failed"]),
});
