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

## 2026-07-05 — Second attempt: content-anchored coordinates (Option A2)
- Decision: keep sticky labels inside the single `scrollRef` (`position: sticky; left: 0`), but anchor all clientX→time math on a **content origin element** instead of the scroller's left edge.
- Utils: `timeSecFromTimelineClientX` + `timeSecFromTimelineDropEvent` accept optional `contentOriginEl`; `useTimelineTransport` + `useStructureTimelineImageDrop` take `contentOriginRef`; `useTimelineZoom` takes `originInsetPx` (label width subtracted from viewport + wheel anchor).
- Editor: row-pair flex layout (sticky label cell + content cell per row); `timeline-content-origin` div at `left: labelWidth` hosts the playhead overlay; marquee stacks wrap only content cells.
- Label width: 248px with audio DAW lanes, else 96px (`timelineLabelColumnWidthPx`).
- Windowed coordinate behavior preserved algebraically (scrolled ruler click at +700px with scrollLeft 400 → 55s, verified in Playwright).
- Tests: 3/3 Playwright (`2026-07-04-timeline-row-alignment.spec.ts` incl. sticky-pin + scrub scrolled/unscrolled), unit tests for scrub utils + transport, audit extended with sticky-label/origin checks.
- `npm run verify -- --frontend` green.
- Open: manual Tauri smoke (`#qa-timeline-row-alignment-tauri`) with real project.
