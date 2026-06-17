# T75 — Dedupe priority list (Fallow ROI)

**Status:** todo  
**Typ:** plan  
**Scope:** `src/`, `functions/_shared/` (Scriptony core per [`.fallowrc.jsonc`](../.fallowrc.jsonc))

## Ziel

Priorisierte Duplikat-Gruppen für Refactoring-Epics identifizieren — Fokus auf wartbare Core-Logik, nicht Figma-`src/imports/`.

## Ergebnis

- Duplicate scan: `npx fallow dupes --format json` (2026-06-15, fallow 2.96.0)
- Top-20-Liste mit ROI-Ranking: [`docs/CODE_HEALTH_DEDUPE_TOP20.md`](../docs/CODE_HEALTH_DEDUPE_TOP20.md)

## Epics (empfohlene Reihenfolge)

1. **Ripple engine drift** — `dup:bcd77bb4`, `dup:869ed7e4`, `dup:1411f50b` (`_shared` ↔ `src/lib` Kopien eliminieren).
2. **Dropdown loaders** — `dup:c7187d49`, `dup:05feeb75`, `dup:40925025`, Desktop-Paar `dup:2f70e47d` (Book / Structure / Audio / Mobile).
3. **Trim/snap bridges** — `dup:87d6bcb2` (Move vs Trim Hook); Anbindung an T72 Timeline-Lib-Grenze prüfen.
4. **Stats / logs dialogs** — Cluster `dup:57a4f7f9` … `dup:6f547b08` (ein parametrisierter Dialog).
5. **Shared prompts & audio** — `dup:5c41bcd4`, `dup:0fa4161f`, `dup:c6740c16`.
6. **Carousels & page shells** — `dup:faeaa8bb`, `dup:c0b3ad34`.

## Abhängigkeiten / Kontext

- **T71** — Function-Entry `appwrite-handler`; Cross-`index.ts`-Klone als Regression-Watch (nicht in `_shared`-only Top-20).
- **T72** — Timeline-Lib-Boundary; Ripple/Dropdown-Refactors nicht gegen Adapter-Grenzen verstoßen.
- **T70** — Fallow-Scope und Baseline.

## Nächste Implementation-Tickets (Vorschlag)

| Vorschlag | Fokus |
|-----------|--------|
| `todo-T76-implementation-ripple-shared-single-source.md` | Ripple `_shared` vs `src/lib` |
| `todo-T77-implementation-dropdown-mobile-shared.md` | Mobile Book/Structure dropdown |
| `todo-T78-implementation-stats-dialog-unify.md` | Project/Timeline stats dialogs |

## Gate

```bash
npx fallow dupes --format json -q -o /tmp/fallow-dupes.json
# Vergleich Clone-IDs in docs/CODE_HEALTH_DEDUPE_TOP20.md nach größeren Refactors
```

