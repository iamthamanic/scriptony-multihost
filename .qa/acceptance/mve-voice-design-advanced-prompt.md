# Feature: MVE Voice Design Advanced Prompt (Basic/Advanced + Compiler)

<!-- design: .qa/design/mve-voice-design-studio.md — Slice B -->

## Intent

Stimmbeschreibung mit **Basic** (Freitext) und **Advanced** (strukturiertes `MveVoiceDesignSpec`) plus Compiler nach EN `design_prompt` und Feld-Tooltips.

## Happy Path

- [x] Tabs Basic | Advanced im Voice Studio Modal
- [x] Advanced → Basic beim Tab-Wechsel (Compiler)
- [x] Compiler Golden-Tests (Erzähler, junger warmer Mann)
- [x] Tooltips pro Advanced-Feld (Radix + aria)

## Limitations

- Basic → Advanced nur manuell (kein Auto-Extract)

## Tests

- `compile-voice-design-prompt.test.ts`
- Playwright: Advanced-Tab sichtbar in `mve-voice-design-preview.spec.ts`
