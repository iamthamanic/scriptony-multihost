# Feature: MVE: Local SQLite-Persistenz (Line ↔ Clip)

<!-- seeded by ecc-runner from issue #4 -->

## Intent
Lines, LineDirection und VoiceProfile in LocalBackend/SQLite; Bindung an Audio-Clips auf der Structure Timeline.

## Happy Path
- [ ] CRUD Line + VoiceProfile lokal
- [ ] Line an Clip/Szene referenzierbar (`audioClipId`, `sceneId`)
- [ ] Kein raw apiFetch in Components — nur `src/lib/api-adapter/mve-adapter`
- [ ] Repository mapper test (happy path)

## Edge Cases
- [ ] Kein Projekt geöffnet → DE-Fehlermeldung via `requireLocalBackend`
- [ ] Last-write-wins dokumentiert (MVP)

## Regression
- [ ] Bestehende Audio-Clip-CRUD unverändert

## Assumptions
- Cloud-MVE-Persistenz deferred (adapter wirft `localNotSupported`)

## Screenshots
N/A — kein UI in diesem Slice

## Implementation Notes
- Schema v4: `mve_lines`, `mve_voice_profiles`
- `migrateLocalDb` beim Projekt-Öffnen
