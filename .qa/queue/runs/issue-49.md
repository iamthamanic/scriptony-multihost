# ECC Runner — Issue #49

**Feature:** timeline-row-shell-structure  
**Branch:** issue/49-timeline-row-shell-structure  
**PR:** https://github.com/iamthamanic/scriptony-multihost/pull/52

## Phases
- [x] setup / lock / seed acceptance
- [x] implement — RowShell + StructureTimelineStructureRows
- [x] verify-ticket — npm run verify --frontend green
- [x] Playwright alignment spec 1/1 pass
- [x] commit + PR (Closes #49)

## Notes
- Audio/film rows remain legacy parallel columns (#50/#51).
- Tauri harness: `#qa-timeline-row-alignment-tauri` — manual PASS pending.

## 2026-07-05 — Regression + revert
- User report: playhead broken, lanes/sidebars shifted after RowShell merge into editor.
- Root cause: label column moved inside horizontal `scrollRef` → coordinate origin shifted by 248px; `timeline-scrub-utils`, marquee stacks, trim engine all assume content x=0.
- Action: editor layout restored to pre-RowShell two-column state; Slice-1 fixes re-applied; RowShell files removed.
- Issue #49 → `needs-design` (offset-aware utils or overlay labels required).
