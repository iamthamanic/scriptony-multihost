# T76 — Dead code core sweep (pass 1)

**Status:** done  
**Typ:** implementation  
**Scope:** T70–T75 refactor surface

## Ziel

Ungenutzte Extraktionen und Duplikat-Helfer aus dem Code-Health-Programm entfernen.

## Pass 1 removals

| Path | Reason | ~LOC |
|------|--------|------|
| `src/components/projects/DraggableScene.tsx` | T74 extract, zero importers | 779 |
| `structure-timeline-editor-helpers.ts` | Duplicate `calculateWordCountFromContent` (canonical: `timeline-book-duration.ts`) | 26 |
| `StructureTimelineEditor.tsx` | Unused import | 1 |
| `BookDropdownView.tsx` | Dead `BookTimelineData` re-export | 1 |

## Docs

- [`docs/CODE_HEALTH_DEAD_CODE.md`](../docs/CODE_HEALTH_DEAD_CODE.md)

## Gate

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="--frontend" SHIM_CHANGED_FILES="..." npm run checks
```
