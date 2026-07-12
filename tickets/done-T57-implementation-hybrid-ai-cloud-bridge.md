# Ticket T57 — Hybrid AI / Cloud Bridge (Done)

Stand: 2026-05-25

## Ergebnis

- `canUseCloudFeatures()` in `runtime-dispatch.ts` (Appwrite endpoint + projectId).
- `LocalCloudFeatureBanner` + `ScriptonyAssistant` blockiert Send ohne Cloud-Config.
- `useTtsGeneration`: TTS-Hinweis im lokalen Modus ohne Cloud.
- `RuntimeModeSelector`: Hybrid-Hinweis für Desktop.

## Akzeptanz

- Lokal ohne `.env.local` Appwrite: KI/TTS mit erklärendem Banner, kein stiller Fehler.
