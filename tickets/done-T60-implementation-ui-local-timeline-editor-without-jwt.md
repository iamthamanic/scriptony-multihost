# Ticket T60 — UI: Lokale Timeline/Editor ohne JWT (Done)

Stand: 2026-05-25

## Ergebnis

- **`domain-access.ts`:** `usesCloudHttpForDomain()`, `resolveDomainAuthToken()`, `requireCloudAuthToken()` — eine Entscheidungsstelle für UI/Hooks.
- **`timeline-map` / `useProjectTimeline`:** Timeline-Bundle und React Query ohne JWT bei Desktop-local + offenem Projekt; Prefetch angepasst (`ProjectsPage`, `ProjectCardWithPrefetch`).
- **Hotpaths:** `useHierarchyCRUD`, `FilmDropdown`, `BookDropdown`, `VideoEditorTimeline` — Domänen-CRUD ohne „Nicht angemeldet“; Cloud-Uploads nutzen `requireCloudAuthToken()`.
- **Hooks:** `useLazyLoadShots`, `useRippleUpdate`, `useAudioClips`, `useClipUpdate`.
- **`timeline-api.ts`:** `token`-Parameter optional typisiert (Legacy-Wrappers).
- **Doc:** [AUTH_AND_STORAGE_MATRIX.md](../docs/AUTH_AND_STORAGE_MATRIX.md) (bereits verlinkt in GETTING_STARTED).

## Akzeptanz

- [x] Desktop `local`, Workspace + Projekt geöffnet: kein Toast „Nicht angemeldet“ für Film-Timeline-CRUD (API-Pfad).
- [x] Book-Timeline/Struktur über gleiche Token-Gates.
- [x] `useProjectTimeline` enabled bei local ohne `authLoading`-Blockade.
- [x] Cloud-only ohne Session: „Scriptony Cloud: Anmeldung nötig“ (`DomainAccessError`).
- [x] Unit-Tests: `domain-access`, `useHierarchyCRUD`, `runtime-dispatch`; `projects-adapter.test` Mock `isDesktopShell`.
- [x] `npm run typecheck` grün.
- [ ] Voller `npm run checks` + AI Review: REJECT mit Findings außerhalb T60-Scope (Adapter/runtime-dispatch); bei Bedarf T60b oder Folgetickets.

## Smoke (manuell)

1. `npm run dev:desktop` → Tauri-Fenster
2. Workspace → Film-Projekt öffnen → Timeline laden, Act anlegen/löschen
3. Ohne Login: Struktur-CRUD ok; KI/TTS/Upload Hybrid-Hinweis

## Referenzen

- [AUTH_AND_STORAGE_MATRIX.md](../docs/AUTH_AND_STORAGE_MATRIX.md)
- Vorgänger: T55, T59
