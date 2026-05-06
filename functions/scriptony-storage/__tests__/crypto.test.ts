/**
 * Tests für AES-256-GCM encrypt/decrypt.
 */

import { describe, it, expect, vi } from "vitest";
import { encrypt, decrypt } from "../services/crypto";

// Setup required env vars for crypto tests
vi.stubEnv("scriptony_storage_encryption_key", "test-encryption-key-32-chars-long!!");
vi.stubEnv("scriptony_storage_encryption_salt", "test-salt-16-chars");

describe("crypto", () => {
  it("roundtrip: encrypt then decrypt", () => {
    const plaintext = "super-secret-oauth-token-12345";
    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(ciphertext.length).toBeGreaterThan(plaintext.length);

    const decrypted = decrypt(ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertexts for same plaintext (IV randomness)", () => {
    const plaintext = "same-text";
    const c1 = encrypt(plaintext);
    const c2 = encrypt(plaintext);
    expect(c1).not.toBe(c2);
  });

  it("fails on tampered ciphertext", () => {
    const ciphertext = encrypt("secret");
    const tampered = ciphertext.slice(0, -1) + "X";
    expect(() => decrypt(tampered)).toThrow();
  });

  it("handles unicode", () => {
    const plaintext = "🔐 OAuth-Token mit Umläuten: äöüß €";
    const ciphertext = encrypt(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });
});
