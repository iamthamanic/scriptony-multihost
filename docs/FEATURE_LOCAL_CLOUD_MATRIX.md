# Feature-Matrix: Lokal vs. Appwrite vs. Lokal + externe API

> **Stand:** 2026-06-27  
> **Audience:** Produkt, Entwicklung, Agents  
> **Scope:** Tauri Desktop (`profile: local` + geöffnetes `.scriptony`-Projekt) vs. Browser/Cloud vs. Hybrid

Siehe auch: [ARCHITECTURE_LOCAL_CLOUD.md](./ARCHITECTURE_LOCAL_CLOUD.md), [AUTH_AND_STORAGE_MATRIX.md](./AUTH_AND_STORAGE_MATRIX.md), [DESKTOP_FIRST_DEV.md](./DESKTOP_FIRST_DEV.md), [`src/capabilities/registry.ts`](../src/capabilities/registry.ts).

---

## Legende

| Symbol | Bedeutung |
|--------|-----------|
| **Lokal** | Kein Appwrite-Account nötig; Daten/Logik auf dem Rechner (Workspace, SQLite, Tauri) |
| **Appwrite** | Appwrite-Login (JWT) + konfigurierte Functions / DB / Storage |
| **Lokal + API** | Desktop ruft externe Dienste auf (OpenAI, Ollama, Kokoro …); Projektdaten bleiben lokal |

### Untertypen „Lokal + API“

| Tag | Bedeutung |
|-----|-----------|
| **✅ direkt** | Heute ohne Appwrite nutzbar (direkter Call vom Desktop) |
| **🔀 Proxy** | Eigener API-Key, aber Aufruf über Appwrite Function (Login nötig) |
| **🧩 vorbereitet** | Code/Idee vorhanden, Haupt-UI noch nicht verdrahtet |

**Hinweis:** „Hybrid“ im Produkt = **lokale Projektdaten** + **optionale Cloud-Session** für Zusatzfeatures — nicht automatisch 1:1-Spiegelung aller Cloud-Projekte.

---

## 1. Kern-Produkt (Projekt & Timeline)

| Feature | Lokal | Appwrite | Lokal + API |
|---------|:-----:|:--------:|:-------------|
| Workspace / Projektliste | ✅ | Browser-Cloud: Cloud-Liste | — |
| Projekt öffnen / CRUD | ✅ | Nur Cloud-Modus | — |
| Timeline-Struktur (Acts / Sequences / Scenes) | ✅ | Cloud-Pfad | — |
| Szenen CRUD | ✅ | Cloud-Pfad | — |
| Figuren (Timeline) | ✅ | Cloud-Pfad | — |
| Story Beats | ✅ | Cloud-Pfad | — |
| Shots (Metadaten CRUD) | ✅ | Cloud-Pfad | — |
| Audio-Clips CRUD | ✅ | Cloud-Pfad | — |
| Clip-Ripple (Timeline verschieben) | ❌ lokal blockiert | ✅ | — |
| Worldbuilding (Kategorien / Items) | ✅ (synthetische Welt) | Cloud-Pfad | — |
| Welten-Liste | ✅ synthetisch | Cloud-Pfad | — |
| Scripts / Struktur (SQLite) | ✅ | Cloud | — |
| Assets im Projektordner | ✅ Tauri FS | Appwrite Storage | — |
| Shot-Bild-Upload | ✅ → lokaler Asset-Ordner | Cloud Function | — |

**Adapter:** `projects-adapter`, `timeline-*`, `characters-adapter`, `beats-adapter`, `shots-adapter`, `clips-adapter`, `worlds-core`, `items-api`, `categories-api`.

---

## 2. Multi-Voice Engine (MVE)

| Feature | Lokal | Appwrite | Lokal + API |
|---------|:-----:|:--------:|:-------------|
| MVE Lines, Lane-Links, Voice-Profile | ✅ **nur lokal** | ❌ (Cloud: „nicht verfügbar“) | — |
| Voice Consent / Clone / Tune / Generate | ✅ SQLite | ❌ | — |
| MVE Render (Takes, Jobs, Kokoro) | ✅ Sidecar + SQLite | ❌ | **✅ direkt** (Kokoro) |
| Voice-Vorschau / Play | ✅ | ❌ | **✅ direkt** (Kokoro) |
| Text-Block „Enhance“ (Inline-Editor) | ❌* | **🔀 Proxy** `/script/enhance` | LLM extern über Function |
| MVE „Enhance Script“ (Panel) | ❌* | **🔀 Proxy** | wie oben |
| Ergebnis **übernehmen** (Apply) | ✅ lokal | — | — |

\* Auf Desktop ohne Cloud-Login blockiert `audio-story-enhance-adapter` via `canUseCloudSession()`.

**Adapter:** `mve-adapter.ts`, `mve-render-adapter.ts`, `audio-story-enhance-adapter.ts`.

---

## 3. Audio & TTS

| Feature | Lokal | Appwrite | Lokal + API |
|---------|:-----:|:--------:|:-------------|
| Audio-Tracks / Story-Dropdowns | ✅ `LocalAudioRepository` | Cloud Function | — |
| TTS im Local-Profil (`useTtsGeneration.startTts`) | ✅ Kokoro | — | **✅ direkt** |
| TTS Cloud-Job-Queue | — | ✅ `audio-tts-api` + JWT | **🔀 Proxy** |
| STT (Speech-to-Text) | ❌ (nur Settings-UI) | ✅ Function | **🔀 Proxy** (`audio_stt`) |
| Legacy Cloud-TTS-Pipeline | — | ✅ | **🔀 Proxy** |

---

## 4. KI & LLM

| Feature | Lokal | Appwrite | Lokal + API |
|---------|:-----:|:--------:|:-------------|
| **ScriptonyAssistant** (Chat, Verlauf, RAG) | ❌ | ✅ `/ai/chat`, Conversations, Runtime | **🔀 Proxy** (Keys in Cloud-Settings) |
| AI-Einstellungen (Provider, Keys, Toggles) | ❌ persistieren | ✅ `/ai/settings`, `/features/*` | Keys = deine Provider; **Routing über Appwrite** |
| `LocalAiService` (Ollama + Keys in `localStorage`) | — | — | **🧩 vorbereitet** — `LocalBackend.ai`, **Assistant nutzt es nicht** |
| Creative Gym — Challenges / Sessions / Fortschritt | ✅ lokal (JSON) | Optional Cloud-Repo | — |
| Creative Gym — KI-Assist | ✅ Stub / Heuristik | Settings `creative_gym` | **🔀 Proxy** wenn Cloud |
| Stage LLM-Routing | Stage = **LOCAL_ONLY** | Cloud-Settings `stage` | Blender lokal |

**Capability:** `hybrid.ai_assistant` → `CLOUD_SESSION` in `registry.ts`.

**Provider-Allowlist:** `src/lib/ai-provider-allowlist.ts` (`assistant_chat`, `creative_gym`, `image_generation`, `audio_stt`, `audio_tts`, `video_generation`).

---

## 5. Bild & Video

| Feature | Lokal | Appwrite | Lokal + API |
|---------|:-----:|:--------:|:-------------|
| Projekt-Cover generieren | ❌ | ✅ `/ai/image/generate-cover` | **🔀 Proxy** |
| Image-Settings / Key-Validate | ❌ | ✅ `/ai/image/*` | **🔀 Proxy** |
| Video-Generation (Settings) | ❌ | ✅ `video_generation` | **🔀 Proxy** |
| ComfyUI / Local-Bridge | ComfyUI lokal auf Host | Bridge-Kontext oft Appwrite | ComfyUI extern/lokal |
| Stage Render-Jobs (`stage-api`) | ❌ | ✅ Cloud Functions | **🔀 Proxy** |

---

## 6. Style Guide & Storage

| Feature | Lokal | Appwrite | Lokal + API |
|---------|:-----:|:--------:|:-------------|
| Style Guide **lesen** | ✅ lokaler Draft | ✅ mit Cloud-Session | — |
| Style Guide **schreiben / Upload / Jobs** | ❌ | ✅ JWT + Jobs | **🔀 Proxy** |
| Hybrid Storage (Provider-Liste) | Stub / Fallback | ✅ Cloud Storage API | — |
| Datei-Import ins Projekt | ✅ lokal | Cloud Storage | — |

**Capability:** `hybrid.style_guide_read` / `hybrid.style_guide_write`.

---

## 7. Sync, Auth, Admin

| Feature | Lokal | Appwrite | Lokal + API |
|---------|:-----:|:--------:|:-------------|
| App-Login (Local User) | ✅ `LocalAuthAdapter` | — | — |
| Cloud-Login (Hybrid, Achse 2) | optional | ✅ Appwrite Session | — |
| Cloud Sync pro Projekt (T40) | Aktivierung von lokal | ✅ JWT + Config | — |
| Freshness / Sync-Metadaten | — | ✅ `/sync/freshness` | — |
| OAuth (Google / GitHub) | — | ✅ | — |
| Admin / Superadmin / Migration | — | ✅ | — |
| API-Test / API-Debug | — | ✅ | — |
| Async Job-Queue (`jobApi`) | — | ✅ `/v1/jobs/*` | — |
| Self-Hosted Appwrite | — | ✅ eigener Server, **trotzdem Appwrite-Account** | — |

**Capability:** `sync.project_cloud` → `CLOUD_SYNC_PROJECT`.

---

## 8. Stage, Blender, Sonstiges

| Feature | Lokal | Appwrite | Lokal + API |
|---------|:-----:|:--------:|:-------------|
| Stage / Create / Present | ✅ **LOCAL_ONLY** | Cloud Render-Jobs separat | Blender via Tauri |
| Blender Export / Live / Sync | ✅ `LocalBlenderService` | — | Blender extern |
| Editorial Film-Timeline (`clips-api`) | ❌ | ✅ (deprecated) | — |
| Upload-Seite (Drama-Analyse) | UI-Mock | — | — |
| Integration-Tokens (Blender / Comfy) | Settings-UI | ✅ über Backend | — |

---

## Zusammenfassung

### Heute ohne Appwrite-Account (Tauri + lokales Projekt)

- Projekt-Workspace, Timeline-Domänen, Worldbuilding, Scripts, lokale Assets
- **Gesamte MVE-Persistenz** (Lines, Voices, Consent, Clone, Tune, Render-Jobs, Takes)
- **Kokoro-TTS** (MVE-Render, `startTts` im Local-Profil, Voice-Preview)
- Stage / Blender über Tauri
- Creative Gym (Fortschritt lokal; Assist = Stub)
- Style Guide lesen = lokaler leerer Draft

### Heute Appwrite-Pflicht (typisch JWT + Functions)

- Browser-Cloud-Projektliste und voller `AppwriteBackend`-Pfad
- ScriptonyAssistant, AI-/Image-Settings persistieren
- MVE Enhance Script / Text-Block Enhance
- Cloud-TTS-Jobs, STT, Cover-/Video-Generation über Functions
- Style-Guide-Upload/Jobs, Cloud Sync (T40), viele Uploads, Admin, Job-Queue

### Lokal + externe API (Ist vs. Soll)

| Soll (Produktvision) | Ist im Code |
|----------------------|-------------|
| Eigener LLM-Key / Ollama ohne Scriptony-Login | **🧩** `LocalAiService` (Ollama + OpenAI/Anthropic/Deepseek direkt); **nicht** an Assistant/Settings angebunden |
| KI über eigenen Key vom Desktop | **🔀** fast alles über `scriptony-ai` Function nach Cloud-Login |
| TTS ohne Cloud | **✅** Kokoro lokal |

---

## Geplante Richtung (Architektur)

Aus [ARCHITECTURE_LOCAL_CLOUD.md](./ARCHITECTURE_LOCAL_CLOUD.md):

- **Achse 1 — Shell:** Tauri → local; Browser → cloud
- **Achse 2 — Cloud-Session:** Login für Hybrid-Features, nicht für Domänen-CRUD
- **Achse 3 — Daten pro Projekt:** default lokal; optional T40-Sync (kein automatisches 1:1 aller Listen)
- **Ziel „Model A“:** Promote local → cloud (langfristig); heute bleibt SQLite CRUD-Wahrheit

**Empfohlenes Epic (nicht umgesetzt):** Assistant + AI-Settings auf direkte Provider-Calls / `LocalAiService` umstellen; Appwrite optional für Team/Sync.

---

## Referenzen im Repo

| Thema | Ort |
|-------|-----|
| Capability-Gates | `src/capabilities/registry.ts` |
| Runtime-Routing | `src/lib/api-adapter/runtime-dispatch.ts` |
| Cloud-Session | `src/lib/auth/cloud-session.ts` |
| Lokal AI (unverbunden) | `src/backend/local/LocalAiService.ts` |
| Hybrid AI (Function-Proxy) | `src/backend/hybrid/HybridAiService.ts` |
| Assistant UI | `src/components/assistant/ScriptonyAssistant.tsx` |
| TTS lokal | `src/lib/api/local-tts-api.ts`, `src/hooks/useTtsGeneration.ts` |
| MVE nur lokal | `src/lib/api-adapter/mve-adapter.ts` |
