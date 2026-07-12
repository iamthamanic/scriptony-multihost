# `src/lib/api/`

**Facades** — stable API for pages and hooks. Import only from here in `src/components/` and `src/hooks/`.

| Pattern | Example |
|---------|---------|
| Facade | `characters-api.ts` → `characters-adapter` |
| Cloud HTTP only | `characters-cloud-http.ts` (routes documented in [`docs/DOMAIN_GLOSSAR.md`](../../docs/DOMAIN_GLOSSAR.md)) |

Never import `*-cloud-http.ts` from UI.

Capabilities: [`src/capabilities/registry.ts`](../../capabilities/registry.ts).
