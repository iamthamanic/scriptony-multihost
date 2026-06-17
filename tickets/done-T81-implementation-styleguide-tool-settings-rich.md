# T81 — Styleguide Tool Settings Rich

**Status:** done  
**Typ:** implementation  
**Scope:** `src/components/projects/styles/tool-settings/`, `src/lib/style-profile/tool-settings-params.ts`

## Umgesetzt

- Prompt/Negative als Tag-Chips (sync mit `promptTemplate` / `negativePrompt`)
- Reference Strength, ControlNet-Slider (ComfyUI)
- Blender: Render Engine, Color Management, Shader/Outline Presets
- Export Style Package (client-side JSON, `export-style-package.ts`)
- Rich Inspector im Builder + Tool Settings Tab

## Checks

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="--frontend" \
SHIM_CHANGED_FILES="src/components/projects/styles/tool-settings/,src/lib/style-profile/tool-settings-params.ts" \
npm run checks
```
