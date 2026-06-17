# T79 — Styleguide Rich UI Wave 1 (Builder Chrome + 8 Sections)

**Status:** done  
**Typ:** implementation  
**Parent:** [T78 plan](./todo-T78-plan-styleguide-rich-ui.md) Paket A + Paket B Welle 1

## Umgesetzt

### Paket A — Builder Chrome
- `StyleProfileBuilderSidebar` — Preset-Dropdown, Neues Profil, Vergleichen, 18er-Nav, Style-Strength-Platzhalter
- `StyleProfileEditorHeader` — Name, Typ, Version, Summary, Preview-Thumbnail
- `StyleProfileBuilderStatusBar` — ID, Last saved, Dirty/Sync
- `StyleStrengthGauge` — „—“ ohne Fake-Prozente, Analyze disabled (Step 5)

### Paket B — Rich Section Cards (8)
- `StyleSectionCardRouter` + `section-params.ts`
- Shared: `TagChipInput`, `SectionSliderRow`, `PaletteSwatchEditor`, `SectionCardFrame`
- Spezialisiert: styleDna, colorSystem, lineSystem, shadingLighting, doAvoid, characterRules, shapeLanguage, cameraComposition
- Restliche 10 Sektionen: generische `StyleSectionCard` (Fallback)

## Tests
- `src/lib/style-profile/__tests__/section-params.test.ts`

## Checks

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="--frontend" \
SHIM_CHANGED_FILES="src/components/projects/styles/,src/lib/style-profile/section-params.ts,src/lib/style-profile/__tests__/section-params.test.ts" \
npm run checks
```

## Nächste Schritte (T78)
- T80: Welle 2 (creature, vehicle, material, fx, pose, recognition, validation)
- T81: Tool Settings Rich
- T83: Referenz-Presets
