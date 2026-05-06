/**
 * Minimal AES-256-GCM encryption for OAuth tokens at rest.
 * Key from env `scriptony_storage_encryption_key` (fallback: APPWRITE_API_KEY).
 * Uses random IV (12 bytes) + authTag (16 bytes) prefixed to ciphertext.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { getOptionalEnv, getRequiredEnv } from "../../_shared/env";

const ALG = "aes-256-gcm";
const IV_LEN = 12;
const AUTH_TAG_LEN = 16;
const SALT = "scriptony-storage-v1";

function getKey(): Buffer {
  const raw = getOptionalEnv("scriptony_storage_encryption_key") || getRequiredEnv("APPWRITE_API_KEY");
  return scryptSync(raw, SALT, 32);
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
}

export function decrypt(ciphertext: string): string {
  const data = Buffer.from(ciphertext, "base64url");
  const iv = data.subarray(0, IV_LEN);
  const authTag = data.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
  const encrypted = data.subarray(IV_LEN + AUTH_TAG_LEN);
  const decipher = createDecipheriv(ALG, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
