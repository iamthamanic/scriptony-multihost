/**
 * Zod schema for DELETE /account — testable without HTTP.
 * Location: functions/scriptony-auth/delete-account-schema.ts
 */

import { z } from "zod";

export const DeleteAccountBodySchema = z.object({
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
});

export type DeleteAccountBody = z.infer<typeof DeleteAccountBodySchema>;

export function parseDeleteAccountBody(
  raw: unknown,
): { ok: true; data: DeleteAccountBody } | { ok: false; message: string } {
  const parsed = DeleteAccountBodySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
    };
  }
  return { ok: true, data: parsed.data };
}
