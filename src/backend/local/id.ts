/** Generate prefixed local entity IDs (T38+). */
export function localId(prefix: string): string {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new Error("crypto.randomUUID is required for local IDs");
  }
  return `${prefix}_${crypto.randomUUID()}`;
}
