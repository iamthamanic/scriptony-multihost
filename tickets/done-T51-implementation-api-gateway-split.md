# Scriptony Ticket T51 — Implementation: api-gateway Split

Stand: 2026-05-24

**Status:** done

## Ziel

`src/lib/api-gateway.ts` (667 Zeilen, Hard Violation) in fokussierte Module unter **500** (Ziel **≤300** pro Datei) aufteilen — **ohne** Routing- oder HTTP-Verhalten zu ändern.

Parent: `tickets/todo-T50-plan-codebase-file-size-refactor.md` (Welle A)

## Ist

- Eine Datei: Route-Map, Error-Klassen, URL-Join, Fetch-Wrapper, Special Cases.
- Viele Imports im Frontend; Public API muss stabil bleiben.

## Soll-Struktur

```text
src/lib/api-gateway/
├── index.ts              # Re-exports (backward compatible)
├── route-map.ts          # ROUTE_MAP, getBackendFunctionForRoute
├── gateway-errors.ts     # ApiGatewayError, ApiGatewayErrorLayer
├── gateway-fetch.ts      # fetchViaGateway, request helpers
└── types.ts              # shared types if needed
```

Optional: `src/lib/api-gateway.ts` bleibt dünner Re-Export- Barrel (~20 Zeilen) für bestehende Imports.

## Arbeitsregeln

- Keine Logik-Änderung; nur Verschiebung.
- `git mv` / extract — keine Duplikate.
- Bestehende Tests/Imports: `from "./api-gateway"` weiter gültig.

## Akzeptanzkriterien

- [x] Keine Datei im Split >500 Zeilen (Ziel ≤300).
- [x] `grep -r "api-gateway"` — Imports funktionieren (Barrel oder index).
- [x] Cloud/API-Verhalten unverändert (Smoke: ein Projects- und ein Audio-Call-Pfad manuell oder bestehende Tests).
- [x] `SHIM_CHANGED_FILES="src/lib/api-gateway.ts,src/lib/api-gateway/..." CHECK_MODE=snippet npm run checks`
- [x] Done Report in `docs/scriptony-architecture-refactor 25.04.26.md`

## Checks

```bash
CHECK_MODE=full bash scripts/checks/project-rules.sh  # api-gateway nicht mehr FAIL
SHIM_CHANGED_FILES="src/lib/api-gateway.ts,src/lib/api-gateway/index.ts,..." CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --frontend
```
