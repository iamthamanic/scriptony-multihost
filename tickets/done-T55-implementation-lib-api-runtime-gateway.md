# Ticket T55 — lib/api Runtime Gateway (Done)

Stand: 2026-05-25

## Ergebnis

Runtime-Dispatch (`isLocalProfile`) in:

- `timeline-api-v2.ts` (+ `timeline-local.ts`)
- `audio-clip-api.ts`, `audio-story-api.ts` (+ `audio-story-local.ts`)
- `characters-api.ts`
- `shots-api.ts` (+ `shots-local.ts`)
- `beats-api.ts` (local: leere Liste / klare Fehler bei Mutations)

## Akzeptanz

- Geöffnetes lokales Projekt: Timeline/Struktur/Audio-Clips/Characters/Shots ohne HTTP an Appwrite Functions.
