/**
 * AES-256-GCM encryption for OAuth tokens at rest.
 *
 * Requires env vars:
 *   - scriptony_storage_encryption_key: 32+ char passphrase for AES key derivation
 *   - scriptony_storage_encryption_salt: 16+ char installation-specific salt
 *
 * Uses random IV (12 bytes) + authTag (16 bytes) prefixed to ciphertext.
 * No fallback key — function fails at startup if keys are missing.
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { getRequiredEnv } from "../../_shared/env";

const ALG = "aes-256-gcm";
const IV_LEN = 12;
const AUTH_TAG_LEN = 16;

function getKey(): Buffer {
  const raw = getRequiredEnv("scriptony_storage_encryption_key");
  const salt = getRequiredEnv("scriptony_storage_encryption_salt");
  if (raw.length < 32) {
    throw new Error(
      "scriptony_storage_encryption_key must be at least 32 characters",
    );
  }
  if (salt.length < 16) {
    throw new Error(
      "scriptony_storage_encryption_salt must be at least 16 characters",
    );
  }
  return scryptSync(raw, salt, 32);
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
}

export function decrypt(ciphertext: string): string {
  const data = Buffer.from(ciphertext, "base64url");
  const iv = data.subarray(0, IV_LEN);
  const authTag = data.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
  const encrypted = data.subarray(IV_LEN + AUTH_TAG_LEN);
  const decipher = createDecipheriv(ALG, getKey(), iv, {
    authTagLength: AUTH_TAG_LEN,
  });
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}
