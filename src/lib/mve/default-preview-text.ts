/**
 * Default preview sentence for MVE character voice testing.
 * Location: src/lib/mve/default-preview-text.ts
 */

export const MVE_DEFAULT_PREVIEW_TEXT =
  "Hallo, so klingt meine Stimme in dieser Szene.";

export function mveDefaultPreviewForCharacter(characterName: string): string {
  const name = characterName.trim();
  if (!name) return MVE_DEFAULT_PREVIEW_TEXT;
  return `Hallo, ich bin ${name}. So klingt meine Stimme.`;
}
