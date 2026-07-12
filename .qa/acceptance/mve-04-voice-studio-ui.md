# Feature: MVE 0.4: Voice Studio UI aktivieren

<!-- seeded by ecc-runner from issue #16 on 2026-06-27 -->

## Intent

Generate, Clone und Tune im Charakterstimme-Modal nutzbar (PRD §13.4).

## Happy Path

- [x] Generate/Clone/Tune Sections sichtbar und aktiv (local)
- [x] `VoiceProfileFutureSections` nur noch Performance Reference gesperrt
- [x] DE loading/empty/error in Section-Komponenten
- [x] Playwright-Spec prüft 0.4-Sections (`data-testid`)

## Edge Cases

- [x] Cloud-only Features disabled mit Hinweis (`isLocalProfile`)
- [x] Modal scroll auf kleinem Viewport (`max-h-[90vh] overflow-y-auto`)

## Regression

- [x] Basis VoiceProfile CRUD + Preview unverändert

## Implementation Notes

- Sections: `VoiceStudioGenerateSection`, `VoiceStudioCloneSection`, `VoiceStudioTuneSection`
- Wiring in `VoiceProfileEditorModal` / `VoiceProfileEditorForm`
- Verify: `.qa/runs/mve-6b-voice-ui.spec.ts`
