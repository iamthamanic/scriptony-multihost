# Ticket T54 — Local Project Detail Routing (Done)

Stand: 2026-05-25

## Ergebnis

- `AppContent`: Bei `local` + `selectedId` → `LocalProjectOpenGuard` + `ProjectsPage` (statt `LocalProjectShell`).
- `LocalProjectOpenGuard`: Prüft geöffnetes `LocalProjectContext` und `projectId`-Match.
- `LocalProjectShell.tsx` entfernt.

## Akzeptanz

- Desktop: Workspace → Projekt öffnen → volle Projekt-Detail-UI (Timeline/Struktur soweit T55 liefert Daten).
