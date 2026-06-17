# T77 — Styleguide Step 2: Cloud Spec Storage

**Status:** done  
**Typ:** implementation  
**Scope:** Cloud / Hybrid (`scriptony-style`, Adapter, UI, Desktop hybrid push)

## Ziel

Volle `StyleProfileSpec` in der Cloud persistieren (nicht nur Summary in `configJson`), `specRef` verdrahten, Cloud-Browser-Editor freischalten, Preview-Bilder hochladen, Hybrid Desktop Push.

## Umgesetzt

### Backend

- `functions/scriptony-style/style-spec-storage.ts` — Spec in `general` bucket, `specRef` lifecycle
- `functions/_shared/storage.ts` — download/delete by ID
- `functions/_shared/style-profile-schema.ts` — optional `spec` in create/update
- `functions/scriptony-style/style-service.ts` — create/update/delete + preview upload
- `functions/scriptony-style/index.ts` — GET lädt Spec; PUT/POST speichern Spec; preview route

### Frontend

- `src/lib/api/style-profile-cloud-http.ts` — volle Spec round-trip
- `src/lib/api-adapter/style-profiles-adapter.ts` — cloud + local dispatch, hybrid push
- `src/lib/style-profile/hybrid-cloud-push.ts` — best-effort upsert/delete/active nach lokalem Save
- `src/lib/style-profile/preview-url.ts` — Preview-URLs
- `src/components/projects/styles/tabs/StyleProfileOverviewTab.tsx` — Preview-Upload
- `src/backend/local/LocalProjectContext.ts` — `migrateLocalDb` beim Öffnen (v4 `style_profiles`)

### Hybrid Desktop (best effort)

Nach lokalem Create/Update/Duplicate → Background `upsertStyleProfileToCloud` → `cloud_id` + `sync_status` in SQLite.

`setActiveStyleProfile` spiegelt `activeStyleProfileId` als Cloud-Profil-ID in `metadata_json`.

Preview-Upload hybrid: nutzt `sync.cloudId` wenn Cloud-Session aktiv.

## Offen (nicht Step 2)

- Manueller Smoke (`scripts/smoke-style-profiles.mjs`) — blockiert durch Auth Rate-Limit / Bearer
- Dediziertes Bucket `style-profile-specs` — optional, deferred
- Vollständiger Sync-Engine — Step 3 (T40-Pattern)

## Checks

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="--frontend --backend" \
SHIM_CHANGED_FILES="functions/scriptony-style/,functions/_shared/storage.ts,functions/_shared/style-profile-schema.ts,src/lib/style-profile/,src/lib/api/style-profile-cloud-http.ts,src/lib/api-adapter/style-profiles-adapter.ts,src/lib/api-adapter/style-profiles-local.ts,src/backend/local/LocalStyleProfileRepository.ts,src/backend/local/LocalProjectContext.ts,src/hooks/useProjectStyleProfiles.ts,src/components/projects/styles/,docs/STYLEGUIDE_SYSTEM_CONCEPT.md" \
npm run checks
```

## Acceptance

- [x] Cloud CRUD mit voller Spec (Storage + specRef)
- [x] Cloud-Browser Editor ohne Limited-Banner
- [x] Preview-Upload (Cloud + Hybrid mit cloudId)
- [x] Hybrid Push nach lokalem Save
- [x] Migration `style_profiles` on open
- [x] Unit tests (hybrid push, repository sync meta, schema migrations)
