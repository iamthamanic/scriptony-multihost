/**
 * Typed delete confirmation for project removal (local + cloud UI).
 * Not the Appwrite account password — cloud DELETE uses the session JWT only.
 *
 * Location: src/lib/local-project-delete-confirmation.ts
 */

/** User must type this word (case-insensitive). */
export const LOCAL_PROJECT_DELETE_CONFIRMATION_PHRASE = "delete";

export function normalizeLocalDeleteConfirmation(input: string): string {
  return input.trim().toLowerCase();
}

export function isLocalDeleteConfirmationValid(input: string): boolean {
  return (
    normalizeLocalDeleteConfirmation(input) ===
    LOCAL_PROJECT_DELETE_CONFIRMATION_PHRASE
  );
}

export function localDeleteConfirmationErrorMessage(): string {
  return `Zur Bestätigung „${LOCAL_PROJECT_DELETE_CONFIRMATION_PHRASE}" eingeben.`;
}
