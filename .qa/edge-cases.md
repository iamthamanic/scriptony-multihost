# Scriptony — project-specific edge cases for verify-ui / verify-ticket

Extends universal verify-ui matrix. Locale: **de**.

## Global

| ID | Case | Fail if |
|----|------|---------|
| G-01 | Tauri app loads | Blank WebView, uncaught console errors |
| G-02 | Workspace gate | Features work without workspace when they require it |
| G-03 | Local project | `.scriptony` project not open but local data APIs called |
| G-04 | Locale | UI not German where required |

## Desktop / runtime

| ID | Case | Fail if |
|----|------|---------|
| R-01 | dev:desktop | Routine work suggests `npm run dev` (Docker) |
| R-02 | Cloud without session | Hybrid API called when `canUseCloudSession()` false |
| R-03 | Raw cloud fetch in UI | New `apiFetch` in components instead of api-adapter |

## Audio / timeline

| ID | Case | Fail if |
|----|------|---------|
| A-01 | Timeline lanes | Character dialog vs SFX lane misclassified |
| A-02 | Local audio | Clip created but not persisted in local SQLite |

## Multi-Voice-Engine (epic)

| ID | Case | Fail if |
|----|------|---------|
| MVE-01 | Script module purity | TTS provider imported in schema/script module |
| MVE-02 | Dirty lines | Script edit without invalidating takes |
| MVE-03 | Enhance safety | Enhance invents facts or changes names/numbers |
