/**
 * Tests für Storage-Provider-Konfiguration und Schemas.
 */

import { describe, it, expect } from "vitest";
import {
  PROVIDERS,
  connectionSchema,
  targetSchema,
  objectSchema,
  syncSchema,
} from "../services/providers";

describe("PROVIDERS", () => {
  it("enthält bekannte Provider", () => {
    expect(PROVIDERS.google_drive.label).toBe("Google Drive");
    expect(PROVIDERS.dropbox.label).toBe("Dropbox");
    expect(PROVIDERS.onedrive.label).toBe("OneDrive");
    expect(PROVIDERS.kdrive.label).toBe("kDrive");
  });
});

describe("connectionSchema", () => {
  it("validiert gültige Connection", () => {
    const result = connectionSchema.safeParse({
      provider: "google_drive",
      access_token: "token123",
    });
    expect(result.success).toBe(true);
  });

  it("lehnt unbekannten Provider ab", () => {
    const result = connectionSchema.safeParse({
      provider: "unknown",
      access_token: "token123",
    });
    expect(result.success).toBe(false);
  });
});

describe("targetSchema", () => {
  it("validiert gültiges Target", () => {
    const result = targetSchema.safeParse({
      owner_type: "user",
      owner_id: "user123",
      connection_id: "conn456",
    });
    expect(result.success).toBe(true);
  });
});

describe("objectSchema", () => {
  it("validiert gültiges Object", () => {
    const result = objectSchema.safeParse({
      connection_id: "conn123",
      target_id: "target456",
      provider_path: "/folder/file.txt",
      size_bytes: 1024,
    });
    expect(result.success).toBe(true);
  });
});

describe("syncSchema", () => {
  it("validiert gültigen Sync-Status", () => {
    const result = syncSchema.safeParse({
      connection_id: "conn123",
      status: "running",
    });
    expect(result.success).toBe(true);
  });
});
