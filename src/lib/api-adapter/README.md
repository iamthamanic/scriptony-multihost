# `src/lib/api-adapter/`

Runtime routing between **local SQLite** and **cloud HTTP**.

- [`runtime-dispatch.ts`](runtime-dispatch.ts) — `dispatchByRuntime`, `requireLocalBackend`
- [`domain-access.ts`](domain-access.ts) — `usesCloudHttpForDomain`, cloud session gates
- `*-adapter.ts` — public routing entry (one per domain)
- `*-local.ts` — `requireLocalBackend()` only

Do not call `apiGet` from UI. See [`../api/README.md`](../api/README.md).
