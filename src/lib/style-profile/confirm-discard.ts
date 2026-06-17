/**
 * Confirm discarding unsaved style profile edits.
 * Location: src/lib/style-profile/confirm-discard.ts
 */

export function confirmDiscardUnsavedStyleChanges(): boolean {
  return window.confirm(
    "Ungespeicherte Änderungen am Style Profile verwerfen?",
  );
}
