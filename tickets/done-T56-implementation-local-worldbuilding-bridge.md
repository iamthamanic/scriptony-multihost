# Ticket T56 — Local Worldbuilding Bridge (Done)

Stand: 2026-05-25

## Ergebnis

- `worlds-adapter.ts`: Synthetische Projekt-Welt (`local-world-{projectId}`), Kategorien aus `world_items.category`, Items via `LocalWorldbuildingRepository`.
- `LegacyWorld` / `LegacyWorldItem` Typen für WorldbuildingPage.

## Akzeptanz

- Worldbuilding/Home mit geöffnetem lokalem Projekt: keine stille HTTP-Fehlerseite; Welten anlegen/löschen lokal deaktiviert mit klarer Meldung.
