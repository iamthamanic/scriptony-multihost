/**
 * SHA-256 hex digest helpers for voice consent records.
 * Location: src/lib/mve/safety/sha256-hex.ts
 */

export async function sha256HexFromArrayBuffer(
  buffer: ArrayBuffer,
): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256HexFromFile(file: File): Promise<string> {
  return sha256HexFromArrayBuffer(await file.arrayBuffer());
}
