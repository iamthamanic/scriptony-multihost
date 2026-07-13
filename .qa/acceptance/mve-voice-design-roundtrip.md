# Feature: MVE Voice Design Roundtrip (design_spec_json)

<!-- design: .qa/design/mve-voice-design-studio.md — Slice C -->

## Intent

`MveVoiceDesignSpec` wird in SQLite (`design_spec_json`) persistiert und beim Voice-Select / Speichern in Basic+Advanced geladen.

## Happy Path

- [x] Schema v7: `mve_voice_profiles.design_spec_json`
- [x] Save candidate + manual Save persistieren `designSpec`
- [x] Voice assign lädt `description` + `designSpec` ins Modal

## Regression

- [x] Alte Projekte: nullable Spalte, Migration idempotent

## Tests

- Schema migration v7 (extend `schema-migrations.test.ts` wenn nötig)
