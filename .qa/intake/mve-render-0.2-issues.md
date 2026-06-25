# Issue draft: MVE Render Layer 0.2 (Adapter + Takes)

**Status:** CREATED ON GITHUB (2026-06-14)

**Epic design:** `.qa/design/mve-render-0.2.md`  
**Parent epic:** `.qa/design/multi-voice-engine.md`  
**PRD source:** `docs/multi-voice-engine.md` (MVP 0.2, §12.7, §22.3, §25)  
**UI anchor:** Timeline Dialog-Clip / `MveLineInspector` / Take-Panel

## Summary (7 Issues)

| GitHub | Priority | Title | Depends on (batch) | Repo blockers |
|--------|----------|-------|--------------------|---------------|
| [#17](https://github.com/iamthamanic/scriptony-multihost/issues/17) | P0 | MVE 0.2: Schema AudioJob + Take + Render-Typen | — | #3 |
| [#18](https://github.com/iamthamanic/scriptony-multihost/issues/18) | P0 | MVE 0.2: VoiceEngineAdapter + Registry | #17 | #3 |
| [#19](https://github.com/iamthamanic/scriptony-multihost/issues/19) | P1 | MVE 0.2: DummyAdapter (Offline / Tests) | #18 | — |
| [#20](https://github.com/iamthamanic/scriptony-multihost/issues/20) | P1 | MVE 0.2: KokoroAdapter (Refactor local TTS) | #18 | — |
| [#21](https://github.com/iamthamanic/scriptony-multihost/issues/21) | P0 | MVE 0.2: SQLite AudioJob + Takes Persistenz | #17, #18 | #4 |
| [#22](https://github.com/iamthamanic/scriptony-multihost/issues/22) | P1 | MVE 0.2: Render Line Service + Job-Snapshot | #18–#21 | #5, #6 |
| [#23](https://github.com/iamthamanic/scriptony-multihost/issues/23) | P1 | MVE 0.2: Take Selection + Render UI (Timeline) | #22 | #5 |

**Empfohlene Reihenfolge:** **#17 → #18 → (#19 ∥ #20 ∥ #21) → #22 → #23**

**Entblockt:** MVP 0.3 Scene Mix, [#14](https://github.com/iamthamanic/scriptony-multihost/issues/14) Clone (`cloneVoice?`), T65 OpenVoice Eval

---

## Next steps

1. `@ecc-runner` — **#17 → #18 → (#19 ∥ #20 ∥ #21) → #22 → #23**
2. [#6](https://github.com/iamthamanic/scriptony-multihost/issues/6) / [#7](https://github.com/iamthamanic/scriptony-multihost/issues/7) (0.1) parallel möglich
