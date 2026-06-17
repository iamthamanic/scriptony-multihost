# T100 — Projekt-Subnav: Settings-Tab (Plan)

**Status:** todo  
**Typ:** plan  
**Phase:** 2b  
**Parent:** [T97 Roadmap](./todo-T97-plan-puppet-layer-phase4-roadmap.md)  
**Parallel zu:** [T99 Stage](./todo-T99-plan-project-subnav-stage.md)

## Problem

Projekt-Einstellungen sind **verstreut**:

- `ProjectCloudSyncSection` — doppelt in `ProjectsPage` (~5118, ~6137) und `ProjectForm`
- Aktives Style-Profil — nur im Style-Guide-Collapsible
- Cloud-Sync-Status — nur in Style-Editor Status-Bar

Nutzer finden Hybrid-/Profil-Optionen nicht an einem Ort.

## Zielbild (UX)

```
Subnav: … | Renders | Einstellungen

#project-section-settings
┌─ Einstellungen ────────────────────────────────────┐
│  Style                                              │
│    Aktives Profil: [Dropdown ▼]  (setActiveStyle)   │
│    Sync: 2 ausstehend · 1 Konflikt [Sync] [Lösen]   │
│  Cloud (nur Desktop-local)                          │
│    <ProjectCloudSyncSection />                      │
│  Projekt                                            │
│    Kurzlink zu Export / Typ / Linked World (bestehend)│
└────────────────────────────────────────────────────┘
```

Deep-Link: `#projekte/{projectId}/settings`

## Architektur (KISS / SOLID / DRY)

| Komponente | Rolle |
|------------|-------|
| `ProjectSettingsSection.tsx` | **neu** — Shell + Abschnitte |
| `ProjectStyleSettingsBlock.tsx` | **neu** — Active Profile + `useStyleProfileSync` + Konflikt-Banner |
| `ProjectCloudSyncSection` | **unverändert importieren** — nicht kopieren |
| `useActiveStyleProfileId` / `setActiveStyleProfile` | bestehende Hooks |
| `StyleProfileConflictBanner` | wiederverwenden wenn Konflikt-Profile in Liste |

**Refactor (DRY):** `ProjectCloudSyncSection` aus redundanter Stelle in `ProjectsPage` **entfernen**, nur noch unter Settings + ggf. ProjectForm belassen.

## Dateien

| Aktion | Pfad |
|--------|------|
| neu | `src/components/projects/ProjectSettingsSection.tsx` |
| neu | `src/components/projects/settings/ProjectStyleSettingsBlock.tsx` |
| ändern | `ProjectDetailSubnav.tsx` — `settings` |
| ändern | `ProjectsPage.tsx` — section, deep-link, **CloudSync-Duplikate entfernen** |
| optional | `ProjectForm.tsx` — Cloud-Sync nur verweisen „siehe Einstellungen“ |

## Kein neues Backend

Alles über bestehende Adapter:

- `style-profiles-adapter` — list, active, sync
- `ProjectCloudSyncSection` — Tauri/cloud activate

## Acceptance

- [ ] Tab **Einstellungen** + `project-section-settings`
- [ ] Aktives Style-Profil wechseln ohne Style-Collapsible öffnen
- [ ] Projektweiter Sync-Button (ruft `syncStyleProfilesBidirectional`)
- [ ] Konflikt-Hinweis mit Link zum betroffenen Profil-Editor
- [ ] `ProjectCloudSyncSection` genau **einmal** auf Projekt-Detail (in Settings)
- [ ] Deep-Link `#projekte/{id}/settings`

## Checks

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="--frontend" \
  SHIM_CHANGED_FILES="src/components/projects/ProjectSettingsSection.tsx,src/components/projects/settings/,src/components/projects/ProjectDetailSubnav.tsx,src/components/pages/ProjectsPage.tsx" \
  npm run checks
```

## Nicht-Ziele

- Globale App-Einstellungen (→ Settings-App-Route)
- Account / Billing
- Vollständiger `ProjectForm`-Ersatz

## Folge-Ticket

`todo-T100-implementation-project-subnav-settings.md`
