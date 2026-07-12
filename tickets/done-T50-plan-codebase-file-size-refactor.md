# Scriptony Ticket T50 — Plan: Codebase File-Size Refactor (Epic) — DONE

Stand: 2026-05-25

## Ziel

Gesamte Codebase schrittweise an **AGENTS.md**-Größenlimits anpassen, ohne Big-Bang-Rewrite.

| Limit | Wert | Gate |
|-------|------|------|
| Soft | **300** Zeilen/Datei | WARN (Snippet) / deferred (Epic close) |
| Hard | **500** Zeilen/Datei | **FAIL** immer |
| Komponente | **150** Zeilen (Richtwert) | manuell beim Split |

## Epic-Abschluss (2026-05-25)

| Kriterium | Status |
|-----------|--------|
| Hard (>500) in `src/` + `functions/` (maintained) | **0** |
| Wellen A–D umgesetzt (T51–T57, T33-Shells, T70–T75, T80–T81) | **ja** |
| Soft (>300) Backlog dokumentiert | `docs/T50-file-size-soft-excludes.md` (133 Dateien) |
| Epic-Gate | `T50_EPIC_HARD_ONLY=1 CHECK_MODE=full bash scripts/checks/project-rules.sh` |

```bash
# Inventar
bash scripts/checks/list-file-size-violations.sh --hard   # 0 hard
bash scripts/checks/list-file-size-violations.sh --all    # soft backlog

# Epic close (hard enforced, soft deferred)
T50_EPIC_HARD_ONLY=1 CHECK_MODE=full bash scripts/checks/project-rules.sh
```

## Erledigte Brocken

| Ticket | Scope | Status |
|--------|-------|--------|
| **T50** | Epic | **done** |
| **T51** | `api-gateway/` | done |
| **T52** | `lib/types/` | done |
| **T53** | `api-client/` | done |
| **T54** | `handlers-*.ts` | done |
| **T55–T57, T33** | Mega-UI Shells + Feature-Ordner | done |
| **T58–T65** | cache, export, APIs, hooks, context | done |
| **T70–T75** | Functions entrypoints | done |
| **T80–T81** | Tests + seeds | done |

## Folgearbeit (Soft ≤300)

- Beim Anfassen: Datei auf ≤300 bringen oder Mini-Ticket `todo-T5x`.
- Liste: `docs/T50-file-size-soft-excludes.md`
- Vollliste: `bash scripts/checks/list-file-size-violations.sh --all`

## ARCH

- **Verification Marker:** `ARCH-REF-T50-DONE` in `docs/scriptony-architecture-refactor 25.04.26.md`

## SOLID / DRY / KISS

Unverändert — siehe ursprünglicher Plan. Team-Regel: **keine neuen Dateien >500**; touched files Hard-Limit enforced.
