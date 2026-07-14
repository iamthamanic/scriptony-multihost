# Auth & Storage Matrix

Stand: 2026-05-24

Kurzreferenz: **wann braucht die App ein Appwrite-JWT**, und **wo liegen Daten**. Ergänzt [AUTH_TRANSPORT_VERTRAG_2026-04-08.md](AUTH_TRANSPORT_VERTRAG_2026-04-08.md) (Cloud-HTTP-Transport) um Local-first und Desktop-Hybrid.

Siehe auch: [FEATURE_LOCAL_CLOUD_MATRIX.md](FEATURE_LOCAL_CLOUD_MATRIX.md) (Feature-Übersicht), `src/lib/api-adapter/runtime-dispatch.ts`, `src/lib/auth/`, Ticket [T60](../tickets/todo-T60-implementation-ui-local-timeline-editor-without-jwt.md).

---

## Leitregel (KISS)

| Frage | Antwort |
|--------|---------|
| Braucht diese Aktion **Cloud-HTTP** (Functions / Appwrite Storage)? | **Ja** → JWT über `getAuthToken()` / `api-client` mit `requireAuth` |
| Läuft sie gegen **geöffnetes lokales Projekt** (Desktop + `local` + `LocalBackend`)? | **Nein** → kein JWT; APIs in `src/lib/api/*` mit `isLocalProfile()`-Branch |
| Fehlt JWT, obwohl Cloud nötig ist? | Meldung: **„Scriptony Cloud / Anmeldung nötig“** — nicht „Nicht angemeldet“ für lokales Schreiben |

**Eine Entscheidungsstelle:** Runtime + Datenpfad (`runtime-dispatch`, später UI-Helfer in T60) — nicht in jeder Komponente `getAccessToken()` prüfen.

---

## Matrix: Runtime × Auth × Daten

| Runtime-Profil | Shell | Auth-Adapter | JWT | Domänen-Daten (Projekt, Timeline, Scripts, …) |
|----------------|-------|--------------|-----|-----------------------------------------------|
| `local` | Tauri Desktop | `LocalAuthAdapter` | `null` | `LocalBackend` / SQLite im `.scriptony`-Ordner |
| `local` | Browser (ohne Override) | — | — | Nicht unterstützt (kein Workspace) |
| `cloud` | Browser | `AppwriteAuthAdapter` | Appwrite Session | HTTP → Functions + Appwrite DB |
| `selfHosted` | Browser / Desktop | `AppwriteAuthAdapter` | Appwrite Session | HTTP → eigener Appwrite |

**Hybrid (Desktop `local` + Appwrite in `.env.local`):** Profil bleibt `local` für Kern-Daten; JWT nur für explizite Cloud-Features (`canUseCloudFeatures()` in `runtime-dispatch.ts`, Banner T57).

---

## Matrix: Speicher × Token

| Nutzer-Einstellung „Speicher“ | Projektinhalt | Medien / Uploads | JWT |
|------------------------------|---------------|------------------|-----|
| Lokal (Default Desktop) | Workspace + `.scriptony` | Projektordner `assets/` | Nein für CRUD |
| Scriptony Cloud | Appwrite DB (+ Sync T40) | Appwrite Storage | Ja für Cloud-APIs |
| Self-hosted Appwrite (T41) | Eigener Server | Eigener Storage | Ja für diesen Server |

Langfristig: Speicher-Präferenz und Runtime entkoppeln dokumentieren (T40 Sync); bis T60 ist **Runtime-Profil** der wirksame Schalter für Domänen-Routing.

---

## Datenfluss (vereinfacht)

```text
                    ┌──────────────────────┐
                    │  UI / Hooks          │
                    └──────────┬───────────┘
                               │
              ┌────────────────┴────────────────┐
              │ usesCloudHttpForDomain()?       │
              │ (local + desktop + project open)│
              └────────────────┬────────────────┘
                    nein │           │ ja
                         ▼           ▼
              ┌──────────────┐  ┌─────────────────┐
              │ lib/api/*    │  │ api-client      │
              │ isLocalProfile│  │ Bearer JWT      │
              │ → *-local.ts │  │ → Functions     │
              └──────────────┘  └─────────────────┘
```

Bereits umgesetzt in der **API-Schicht** (T55/T62): `timeline-api-v2`, `shots-api`, `characters-api`, `beats-api`, `audio-clip-api`, `audio-story-api`, Adapter `projects-adapter`, …

**Lücke (T60b):** verbleibende UI/Hooks mit `getAccessToken()` für Domänen, die lokal schon ohne JWT laufen.

---

## Was **JWT** braucht (Cloud-Pfade)

- Appwrite **Functions** über `api-client` / `api-gateway.ts`
- **Appwrite Storage** (Cloud-Assets, nicht Workspace-Datei)
- **Cloud Sync** pro Projekt (T40, `CloudActivationService`)
- **KI / TTS / Assistant**, wenn über Cloud (T57)
- **Style Guide** Cloud-Persistenz (`canUseCloudStyleGuide()` — lokal: Draft in `style-guide-local-draft.ts`)
- Admin / Superadmin / Migration / API-Debug-Seiten

---

## Was **kein JWT** braucht

- Desktop: Workspace wählen, Projektliste, öffnen, schließen, löschen (T59)
- Timeline/Struktur/Characters/Shots/Clips/Story-Beats **lesen & schreiben**, wenn `local` + geöffnetes Projekt (Beats: SQLite `story_beats`, T62)
- Lokale Style-Guide-Entwürfe, lokale Scripts/Struktur (SQLite)
- Dateizugriff über Tauri FS (Capabilities `workspace-fs`, `local-project-fs`)

---

## Fehlermeldungen (Zielbild)

| Kontext | Statt | Besser |
|---------|-------|--------|
| Lokal, Domäne implementiert | „Nicht angemeldet“ | (kein Toast) oder „Projekt nicht geöffnet“ |
| Lokal, nur Cloud-Feature | „Nicht angemeldet“ | „Scriptony Cloud: bitte anmelden“ + `LocalCloudFeatureBanner` |
| Cloud-Browser, keine Session | — | Login / Redirect Auth |

---

## Module (DRY — nicht duplizieren)

| Verantwortung | Ort |
|---------------|-----|
| Profil / Cloud-Hybrid | `src/runtime/`, `getBackendRuntimeProfile()` |
| Local vs Cloud Routing | `src/lib/api-adapter/runtime-dispatch.ts` |
| Token holen | `src/lib/auth/getAuthToken.ts` |
| HTTP + JWT | `src/lib/api-client.ts` |
| Domänen-Interface | `src/backend/ScriptonyBackend.ts` |
| Legacy-Adapter | `src/lib/api-adapter/*` |

Neue UI-Logik in T60: **ein** Helfer (z. B. `domain-access.ts`) — keine zweite Auth-Schicht parallel zu `runtime-dispatch`.

---

## Abhängigkeiten (Tickets)

| Ticket | Inhalt |
|--------|--------|
| T34 ✅ | Runtime Profile + Auth Boundary |
| T35 ✅ | ScriptonyBackend |
| T55 ✅ | lib/api Runtime Gateway |
| T57 ✅ | Hybrid Cloud Features (KI, Banner) |
| T59 ✅ | Projects UI-Parität |
| **T60** | UI/Hooks ohne JWT für lokale Timeline/Editor |
| T40 | Cloud Sync (bleibt JWT-pflichtig) |
