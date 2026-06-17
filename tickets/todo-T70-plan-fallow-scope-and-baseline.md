# T70 — Fallow scope & file-size baseline

**Status:** done  
**Typ:** plan

## Ziel

Fallow und file-size messen nur Scriptony-Core (Quell-`.ts`/`.tsx`), nicht esbuild-Bundles oder MCP-Subprojekt.

## Umsetzung

- [`.fallowrc.jsonc`](../.fallowrc.jsonc) — `ignorePatterns` für `functions/**/index.js`, `mcp-server-tauri`, `.agents`, Archive
- Baseline: [`docs/CODE_HEALTH_BASELINE.md`](../docs/CODE_HEALTH_BASELINE.md)

## Gate

```bash
bash scripts/checks/list-file-size-violations.sh --markdown
npx fallow health --quiet 2>&1 | tail -5
```
