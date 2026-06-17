# T74 — ProjectsPage split (pass 1–2)

**Status:** at-work  
**Typ:** implementation

## Ziel

`ProjectsPage.tsx` schrittweise nach KISS/SOLID aufteilen.

## Pass 1

| Modul | Inhalt |
|-------|--------|
| [`projects-page-utils.ts`](../src/components/projects/projects-page-utils.ts) | Genre-Parsing, Duration, `getProjectTypeInfo` |
| [`GenrePillGrid.tsx`](../src/components/projects/GenrePillGrid.tsx) | Genre-Pill-Grid |
| [`ProjectInfoSectionTitle.tsx`](../src/components/projects/ProjectInfoSectionTitle.tsx) | Card-Titel |
| [`ProjectDetailLocalDataEffect.tsx`](../src/components/projects/ProjectDetailLocalDataEffect.tsx) | Local-SQLite-Nachlade |

## Pass 2

| Modul | Inhalt |
|-------|--------|
| [`CharacterCard.tsx`](../src/components/projects/CharacterCard.tsx) | Character card UI (~536 LOC) |

**ProjectsPage:** ~8204 → ~6682 LOC (−1522 kumulativ).

## Offen (Pass 3)

- `ProjectDetail` (~4300 LOC) → `src/components/projects/ProjectDetail.tsx`
- `useProjectsPageState.ts` Hook

## Gate

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="--frontend" SHIM_CHANGED_FILES="src/components/pages/ProjectsPage.tsx,src/components/projects/" npm run checks
```
