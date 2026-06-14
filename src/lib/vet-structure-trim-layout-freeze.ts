/**
 * VETILALORAPP — freeze structure row layout during pointer drag (no React overwrite).
 * Location: src/lib/vet-structure-trim-layout-freeze.ts
 */

export interface StructureBlockSnapshot {
  acts: unknown[];
  sequences: unknown[];
  scenes: unknown[];
  shots: unknown[];
}

export type StructureLayoutFrozenRef = {
  current: StructureBlockSnapshot | null;
};

export function freezeStructureRowLayouts(
  frozenRef: StructureLayoutFrozenRef,
  blocks: StructureBlockSnapshot,
): void {
  frozenRef.current = {
    acts: blocks.acts.map((row) => ({ ...(row as object) })),
    sequences: blocks.sequences.map((row) => ({ ...(row as object) })),
    scenes: blocks.scenes.map((row) => ({ ...(row as object) })),
    shots: blocks.shots.map((row) => ({ ...(row as object) })),
  };
}

export function clearFrozenStructureRowLayouts(
  frozenRef: StructureLayoutFrozenRef,
): void {
  frozenRef.current = null;
}

/** Use frozen snapshot during active trim/move, or before React flushes move state. */
export function pickFrozenStructureBlocks<T>(
  frozenRef: StructureLayoutFrozenRef,
  kind: keyof StructureBlockSnapshot,
  live: T[],
  layoutFrozen: boolean,
): T[] {
  const frozenRows = frozenRef.current?.[kind] as T[] | undefined;

  if (layoutFrozen) {
    if (!frozenRows || frozenRows.length === 0) return live;
    return frozenRows;
  }

  if (!frozenRows || frozenRows.length === 0) return live;

  // Body-move sets frozenRef before moveClip state flushes (layoutFrozen still false).
  const frozenIds = new Set(
    frozenRows
      .map((row) => (row as { id?: string }).id)
      .filter((id): id is string => !!id),
  );
  const liveHasNewStructureIds = live.some((row) => {
    const id = (row as { id?: string }).id;
    return id != null && !frozenIds.has(id);
  });
  if (liveHasNewStructureIds) return live;

  return frozenRows;
}
