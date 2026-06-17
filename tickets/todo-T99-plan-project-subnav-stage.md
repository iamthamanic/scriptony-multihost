# T99 — Projekt-Subnav: Stage-Tab (Plan)

**Status:** todo  
**Typ:** plan  
**Phase:** 2a  
**Parent:** [T97 Roadmap](./todo-T97-plan-puppet-layer-phase4-roadmap.md)  
**Voraussetzung:** T98 empfohlen (Cloud-Renders-API); lokal auch ohne Deploy nutzbar

## Problem

Puppet-Layer-Infos (Freshness, GuideBundle, Stage2D/3D, Renders) sind nur **pro Shot** in `ShotCard` / Timeline sichtbar. Es fehlt eine **Projekt-Übersicht** für „was ist stale, was läuft“.

## Zielbild (UX)

```
Subnav: … | Stage | Styles | Renders | …

#project-section-stage
┌─ Stage (Puppet-Layer) ─────────────────────────────┐
│  48 Shots · 12 mit Preview · 3 veraltete Guides     │
│  [Nur veraltete] [Zur Struktur-Timeline]            │
│  ┌──────────────────────────────────────────────┐  │
│  │ Shot 12 · Act 2 · Szene 4    🟠 guides stale   │  │
│  │ GuideBundle rev 3 · Style v5 · [Shot öffnen]   │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

Deep-Link: `#projekte/{projectId}/stage` (analog `styles` / `renders`).

## Architektur (KISS / SOLID / DRY)

| Schicht | Verantwortung |
|---------|----------------|
| `ProjectDetailSubnav` | +1 Tab `stage` |
| `ProjectStageSection.tsx` | **neu** — nur Layout + Liste |
| `ProjectStageShotRow.tsx` | **neu** — eine Zeile pro Shot (optional split wenn >150 Zeilen) |
| `useProjectStageOverview.ts` | **neu** — aggregiert Shots + Freshness |
| `FreshnessBadge` / `useFreshnessLocal` | **wiederverwenden** — keine zweite Freshness-Logik |
| `listProjectRenderJobs` | Link „Renders →“ — nicht duplizieren |

**Kein neues Backend** in T99 — liest bestehende Shot-Liste + lokale Freshness-Felder.

## Datenquelle

```ts
// useProjectStageOverview(projectId)
// 1. getAllShotsByProject(projectId)  — shots-adapter
// 2. Pro Shot: blenderSyncRevision, guideBundleRevision, styleProfileRevision, renderRevision
// 3. computeFreshness (bereits _shared/freshness — im Frontend useFreshnessLocal)
// 4. Filter: showStaleOnly
```

Timeline-Context optional: wenn `ProjectsPage` bereits Shots im State hat, preferieren — sonst einmaliger Fetch.

## Dateien

| Aktion | Pfad |
|--------|------|
| neu | `src/components/projects/ProjectStageSection.tsx` |
| neu | `src/hooks/useProjectStageOverview.ts` |
| ändern | `src/components/projects/ProjectDetailSubnav.tsx` — `stage` |
| ändern | `src/components/pages/ProjectsPage.tsx` — section id, scroll, deep-link |
| ändern | `src/hooks/useRouter.ts` oder Navigation-Parsing — `projectSection === "stage"` |

## Interaktionen

| Aktion | Verhalten |
|--------|-----------|
| Zeile klicken | `ShotCardModal` öffnen oder `onNavigateToShotInStructure` (bestehend) |
| „Zur Timeline“ | `detailSection = structure`, Structure öffnen |
| „Renders“ | `detailSection = renders`, scroll |

## Acceptance

- [ ] Tab **Stage** in Subnav, scroll-target `project-section-stage`
- [ ] Liste aller Shots mit Freshness-Status (min. stale / fresh / unknown)
- [ ] Filter „nur veraltete“
- [ ] Deep-Link `#projekte/{id}/stage` setzt Tab + scroll
- [ ] Desktop-local ohne Cloud-Session funktionsfähig

## Checks

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="--frontend" \
  SHIM_CHANGED_FILES="src/components/projects/ProjectStageSection.tsx,src/hooks/useProjectStageOverview.ts,src/components/projects/ProjectDetailSubnav.tsx,src/components/pages/ProjectsPage.tsx" \
  npm run checks
```

## Nicht-Ziele

- GuideBundle-Inhalt anzeigen (nur Revision + stale) — Details in T96
- Stage2D/3D Editor embedden
- Neue Appwrite Collections

## Folge-Ticket

`todo-T99-implementation-project-subnav-stage.md`
