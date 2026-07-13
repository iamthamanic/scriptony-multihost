# Issue draft: mve-dialog-audio-ux (DRAFT — not created on GitHub)

## Slice 1 — P0: MVE dialog audio UX fix (this implement)

**featureSlug:** `mve-dialog-audio-ux`

### Intent
Header duration shows real audio length when clip bound; footer renders stored peaks; scene/card width stay aligned.

### Acceptance
- [ ] Bound audio → header chip = Audiolänge (tooltip), no WPM chip
- [ ] Footer: real SVG waveform when peaks stored; no duplicate duration chip in footer
- [ ] Upload/record via text block persists `waveformData`
- [ ] Unit tests green; `npm run verify -- --frontend`

**Design:** `.qa/design/mve-dialog-audio-ux.md`
