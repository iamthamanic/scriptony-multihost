# Issue draft: MVE Voice Studio 0.4 (Generate / Clone / Tune)

**Status:** CREATED ON GITHUB (2026-06-24)

**Epic design:** `.qa/design/mve-voice-studio-0.4.md`  
**Parent epic:** `.qa/design/multi-voice-engine.md`  
**PRD source:** `docs/multi-voice-engine.md` (MVP 0.4, §6.2–6.4, §13.4, §20)  
**UI anchor:** `VoiceProfileEditorModal` / `VoiceProfileFutureSections` (disabled → aktiv)

## Summary (6 Issues)

| GitHub | Priority | Title | Depends on (batch) | Blockers (repo) |
|--------|----------|-------|--------------------|-----------------|
| #11 | P0 | MVE 0.4: Schema VoiceConsent + Voice-Operation-Typen | — | #3, #4 |
| #12 | P1 | MVE 0.4: Stimme aus Beschreibung (Attribute Matching) | #11 | #3, #4 |
| #13 | P1 | MVE 0.4: Consent-Flow + Referenz-Audio-Upload | #11 | #3, #4 |
| #14 | P1 | MVE 0.4: Voice Clone Request | #11, #13 | #3, #4, #6 |
| #15 | P1 | MVE 0.4: Voice Tune (non-destructive Preset) | #11 | #3, #4 |
| #16 | P1 | MVE 0.4: Voice Studio UI aktivieren | #12–#15 | #6 |

**Parallel nach #1:** Issues 2, 3, 5 parallel; Issue 4 nach 3; Issue 6 zuletzt.

**Depends on 0.2 (Adapter + Takes):** [#17](https://github.com/iamthamanic/scriptony-multihost/issues/17)–[#23](https://github.com/iamthamanic/scriptony-multihost/issues/23) — insbesondere #18 Registry für `cloneVoice?` in #14.

**Deferred:** Echte Prompt-Voice-Engine, OpenVoice-Adapter (T65), Performance Reference (0.5).

---

## Ponytail Rung 1 (MVP cut)

| PRD | In 0.4 Issues | Deferred |
|-----|---------------|----------|
| Voice Generation aus Beschreibung | Attribute Matching + Katalog | Echte generative Voice-API |
| Voice Clone | Request + Consent + Upload + Profile | Pflicht-Clone-Engine |
| Voice Tune | Derived preset `type=tuned` | ML-Tuning |

---

## Next steps

1. `@ecc-runner` — empfohlene Reihenfolge: **#11 → (#12 ∥ #13 ∥ #15) → #14 → #16**
2. Characters-Panel #6 sollte vor #16 UI-Slice weit sein
