/**
 * Cross-surface character list sync (timeline lane delete ↔ ProjectsPage).
 * Location: src/lib/character-cache-sync.ts
 */

export const CHARACTER_DELETED_EVENT = "scriptony:character-deleted" as const;

export type CharacterDeletedDetail = {
  projectId: string;
  characterId: string;
};

export function emitCharacterDeleted(
  projectId: string,
  characterId: string,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<CharacterDeletedDetail>(CHARACTER_DELETED_EVENT, {
      detail: { projectId, characterId },
    }),
  );
}

export function onCharacterDeleted(
  handler: (detail: CharacterDeletedDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const listener = (event: Event) => {
    const custom = event as CustomEvent<CharacterDeletedDetail>;
    if (!custom.detail?.projectId || !custom.detail?.characterId) return;
    handler(custom.detail);
  };
  window.addEventListener(CHARACTER_DELETED_EVENT, listener);
  return () => window.removeEventListener(CHARACTER_DELETED_EVENT, listener);
}
