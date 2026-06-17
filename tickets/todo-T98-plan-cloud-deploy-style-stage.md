# T98 — Cloud Deploy: scriptony-style + scriptony-stage (Plan)

**Status:** todo  
**Typ:** plan (+ Ops-Checkliste für Implementation)  
**Phase:** 1  
**Parent:** [T97 Roadmap](./todo-T97-plan-puppet-layer-phase4-roadmap.md)  
**Voraussetzung:** T85–T90 im Repo (uncommitted oder gemerged)

## Problem

Neue Routes existieren nur lokal im Bundle:

| Function | Neue Endpoints (T85–T90) |
|----------|---------------------------|
| `scriptony-style` | `POST /ai/style/analyze`, `POST …/validation-asset`, `mode: ai` |
| `scriptony-stage` | `GET /stage/render-jobs?projectId=` |

Hybrid-Desktop-Nutzer mit `VITE_APPWRITE_*` sehen Fehler/Fallbacks, bis deployed.

## Ziel (KISS)

1. Functions bauen und deployen (kein Schema-Refactor)
2. Smoke bestätigen: Analyze, Validation-Upload, Project-Renders-Liste
3. Optional: `shots.styleProfileOverrideId` in Appwrite, falls Collection alt

## Deploy-Ablauf

```bash
# 1) Checks (snippet, backend scope)
CHECK_MODE=snippet SHIM_CHECKS_ARGS="--backend" \
  SHIM_CHANGED_FILES="functions/scriptony-style/,functions/scriptony-stage/,functions/_shared/style-analyze.ts" \
  npm run checks

# 2) Deploy (shim — siehe AGENTS.md)
npx shimwrappercheck run --cli appwrite -- functions deploy scriptony-style
npx shimwrappercheck run --cli appwrite -- functions deploy scriptony-stage

# 3) Schema nur bei Bedarf (Override-Feld fehlt)
node functions/tools/provision-appwrite-schema.mjs
```

## Smoke-Checkliste (manuell / Skript)

| # | Request | Erwartung |
|---|---------|-----------|
| 1 | `POST /ai/style/analyze` `{ spec: {...} }` | `200`, `scores.overall` 0–1 |
| 2 | `POST /ai/style/analyze` `{ profileId, mode: "ai" }` | `200` oder sauberer 4xx ohne Session |
| 3 | `POST …/validation-asset?slotIndex=0` + fileBase64 | `200`, `profile` mit `exampleRefs` |
| 4 | `GET /stage/render-jobs?projectId=` | `200`, `{ jobs: [] }` oder Liste |
| 5 | Bestehend `GET /ai/style/profiles?projectId=` | unverändert OK |

Skript-Basis: `scripts/smoke-style-profiles.mjs` — um Cases 1–3 erweitern (separates Implementation-Snippet, nicht in diesem Plan).

## SOLID / DRY

- **Kein** neuer Function-Entry — nur deploy bestehender `index.ts`
- Gateway-Routen in `VITE_BACKEND_FUNCTION_DOMAIN_MAP` prüfen (falls Hybrid über Gateway)
- Generated `functions/**/index.js` nicht manuell editieren

## Risiken

| Risiko | Mitigation |
|--------|------------|
| Auth Rate-Limit im Smoke | Bearer aus `.env.shim.local`, Retry |
| `styleProfileOverrideId` fehlt in `shots` | `provision-appwrite-schema.mjs` — Feld ist im Repo-Schema |
| AI `mode: ai` ohne Provider-Key | 4xx/503 — UI fällt auf Heuristik zurück (bereits implementiert) |

## Acceptance

- [ ] `scriptony-style` + `scriptony-stage` deployed auf Ziel-Appwrite
- [ ] Smoke 1–4 grün mit Cloud-Session
- [ ] `docs/STYLEGUIDE_SYSTEM_CONCEPT.md` Step 2 Smoke-Checkbox aktualisiert

## Folge-Implementation (optional Ticket)

`todo-T98-implementation-cloud-deploy-smoke.md` — nur wenn Smoke-Skript erweitert werden soll

## Nicht-Ziele

- Deploy aller 20+ Functions
- Production Release / npm audit full gate
- `.env` Secrets ins Repo
