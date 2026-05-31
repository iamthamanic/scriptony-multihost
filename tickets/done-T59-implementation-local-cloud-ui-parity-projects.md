# Ticket T59 — Local/Cloud UI-Parität Projekte (Done)

Stand: 2026-05-24

## Ziel

Desktop-Lokal nutzt dieselbe `ProjectsPage` für Liste, Erstellen, Öffnen und Löschen wie die Cloud-App. Einzige Desktop-Abweichung: `FirstRunWorkspaceGate` beim ersten Start.

## Ergebnis

- **Routing:** `AppContent` — `projekte` immer `ProjectsPage`; `LocalProjectsHub` entfernt.
- **Mapper:** `localDirPath`, `last_edited` auf Workspace-Einträgen und nach Create.
- **Adapter:** `projectsApi` lokal — `create` via `LocalProjectContext`, `delete` inkl. Ordner, `resolveDirPathByProjectId` Helper.
- **Guard:** `LocalProjectOpenGuard` öffnet Session per `openProject(dirPath)` mit Loading/Error.
- **ProjectsPage:** Nach Create → `openProject`, lokales `initializeProject`, Cover nach Open, Delete schließt Session.
- **Docs:** `GETTING_STARTED.md`, `StorageSettingsSection`, Kanban.

## Akzeptanz

- [x] Navigation **Projekte** = gleiche `ProjectsPage` (Suche, Filter, Carousel/Liste, Dialog).
- [x] Kein `LocalProjectsHub` im User-Flow.
- [x] Lokales Erstellen über denselben Dialog; Detail nach Create.
- [x] Klick auf Projekt öffnet Detail (Guard öffnet Session).
- [x] Cloud-Browser unverändert.
- [x] Tests + scoped checks.
- [x] Lokales Löschen: Bestätigungsphrase `PROJEKT LÖSCHEN` (UI + Adapter + Rust), kein Passwort-Pseudonym.

## Bewusst nicht enthalten (T59b / später)

- Vollständige Persistenz aller Cloud-Metadaten in SQLite.
- „Zuletzt geöffnet“ in ProjectsPage.
