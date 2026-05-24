# Scriptony Architecture Refactor Ticket T34 — Runtime Profile und Auth Boundary

Stand: 2026-05-23

## Ziel

Scriptony bekommt eine zentrale Runtime-Erkennung fuer `local`, `cloud` und `selfHosted`, damit Local Mode ohne Konto starten kann, waehrend Cloud/Self-hosted weiterhin Appwrite Auth nutzen.

**Wichtig:** Kein neues `AuthService`-Interface — bestehendes **`AuthClient`** (`src/lib/auth/AuthClient.ts`) und Factory **`getAuthClient()`** / **`createAuthFactory()`** erweitern, nicht parallel ersetzen.

## Implementierungsstand (Repo)

Bereits vorhanden (bei Abschluss pruefen/verdrahten, nicht duplizieren):

- `src/runtime/` — `detect-runtime.ts`, `runtime-config.ts`, `RuntimeProvider`, `useRuntime`
- `src/lib/auth/LocalAuthAdapter.ts`, `createAuthFactory.ts`, angepasstes `getAuthClient.ts`
- `App.tsx` wrapped mit `RuntimeProvider`

Offen typischerweise: `useAuth` / Login-Gates konsistent an Runtime; Audit: keine `isTauri`/`appwrite` Checks in Komponenten.

## Arbeitsregeln

- Keine Breaking Changes ohne Compatibility Wrapper oder dokumentierte Migration.
- Neue Runtime-/Backend-Logik darf nicht direkt in UI-Komponenten landen.
- UI-Komponenten duerfen keine Appwrite-, SQLite-, Tauri- oder Self-hosted-Details kennen.
- Neue Fachlogik muss ueber Domain-Services, Repositories oder klar benannte Adapter laufen.
- Cloud/Appwrite bleibt fuer bestehende Web-/Team-Features voll funktionsfaehig.
- Local Mode darf keinen Login, keinen Appwrite-Server und keinen Docker-Stack voraussetzen.
- Self-hosted Mode darf erst greifen, wenn ein User explizit einen eigenen Endpoint verbindet.
- Jeder Schritt muss Feature-Flag-/Runtime-sicher sein: Cloud-Verhalten darf durch Local-Vorbereitung nicht regressieren.
- Alle Aenderungen muessen zum bestehenden UI/UX-System passen.

## Pflicht-Checks

Standard-Gate fuer normale Tickets:

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks
```

Frontend-only Gate, wenn sicher keine Functions/Appwrite-Konfiguration betroffen sind:

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --frontend
```

Backend-only Gate, wenn sicher kein Frontend/UI betroffen ist:

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --backend
```

Beim Abschluss muss ein Done Report in `docs/scriptony-architecture-refactor 25.04.26.md` ergaenzt werden.

---
## Kontext

T31 und T32 haben den Audio-/Timeline-Kern erweitert. Danach braucht Scriptony eine saubere Runtime-Grenze, bevor Tauri, LocalBackend oder Sync eingefuehrt werden. Das Produktziel ist: Solo-Creator koennen ohne Konto lokal arbeiten; Konten sind nur fuer Cloud, Self-hosted, Sync und Collaboration notwendig.

## Problem

Aktuell ist die App konzeptionell stark Cloud/Appwrite-orientiert. Ein Konto wird implizit als Normalfall behandelt, obwohl Local Mode keinen echten User-Account braucht. Ohne zentrale Runtime-Erkennung entstehen spaeter verstreute Bedingungen wie `isTauri`, `isAppwrite`, `isCloud`, `hasUser`, `isSelfHosted` in Komponenten, Hooks und API-Modulen.

Risiken:

- Login wird versehentlich fuer Local Mode vorausgesetzt.
- Cloud- und Local-Logik vermischen sich in UI-Komponenten.
- Self-hosted Endpoints werden spaeter als Sonderfall statt als eigenes Runtime-Profil eingebaut.
- Tauri wird zu frueh mit App-Logik belastet.

## Loesung

Eine zentrale Runtime-Schicht einfuehren:

```ts
export type RuntimeProfile = "local" | "cloud" | "selfHosted";

export interface RuntimeConfig {
  profile: RuntimeProfile;
  isDesktop: boolean;
  isBrowser: boolean;
  isMobile: boolean;
  appwriteEndpoint?: string;
  appwriteProjectId?: string;
  selfHostedEndpoint?: string;
}
```

Neue Dateien:

```text
src/runtime/
├── runtime-profile.ts
├── detect-runtime.ts
├── runtime-config.ts
└── runtime-provider.tsx
```

Auth nutzt das **bestehende** `AuthClient`-Interface (`AuthSession`, `AuthUserProfile`). Kein zweites Auth-API-Design.

Local Mode: **`LocalAuthAdapter implements AuthClient`** — Session mit `userId: "local-user"`, `profile.metadata.mode: "local"`.

Cloud / Self-hosted: **`AppwriteAuthAdapter`** unveraendert inhaltlich; Endpoint aus `RuntimeConfig` / env (T41 erweitert spaeter dynamische Verbindungen).

Factory (bereits angelegt):

```ts
// src/lib/auth/createAuthFactory.ts
export function createAuthFactory(runtime: RuntimeConfig): AuthClient {
  if (runtime.profile === "local") return new LocalAuthAdapter();
  return new AppwriteAuthAdapter();
}
```

## User Journey

### Local Solo Creator

1. User startet Scriptony Desktop.
2. App erkennt `local` als Runtime-Profil.
3. Kein Login wird angezeigt.
4. Intern liefert `LocalAuthAdapter` die Session `local-user`.
5. User kann spaeter lokale Projekte erstellen, ohne Cloud zu aktivieren.

### Cloud User

1. User oeffnet Web-App oder Desktop im Cloud-Profil.
2. App nutzt `AppwriteAuthAdapter` via `getAuthClient()`.
3. Login ist erforderlich, wenn Cloud-Projekte geoeffnet oder erstellt werden.

### Self-hosted User

1. User waehlt spaeter `Self-hosted verbinden`.
2. Runtime-Profil wird `selfHosted`.
3. Auth laeuft gegen den konfigurierten Appwrite Endpoint.

## Architektur

```text
App Start
  ↓
detectRuntime()
  ↓
RuntimeProvider
  ↓
createAuthFactory(runtime) / getAuthClient()
  ├── local      -> LocalAuthAdapter
  ├── cloud      -> AppwriteAuthAdapter
  └── selfHosted -> AppwriteAuthAdapter (eigener Endpoint, T41)
```

UI-Komponenten duerfen nicht direkt Runtime-Detection betreiben. Sie duerfen nur ueber Provider/Hooks lesen:

```ts
const runtime = useRuntime();
const user = useCurrentUser();
```

## Beispiele

### Runtime Detection

```ts
export function detectRuntime(): RuntimeConfig {
  const explicit = import.meta.env.VITE_SCRIPTONY_RUNTIME;

  if (explicit === "local") {
    return { profile: "local", isDesktop: true, isBrowser: false, isMobile: false };
  }

  if (explicit === "selfHosted") {
    return {
      profile: "selfHosted",
      isDesktop: false,
      isBrowser: true,
      isMobile: false,
      selfHostedEndpoint: import.meta.env.VITE_APPWRITE_ENDPOINT,
      appwriteProjectId: import.meta.env.VITE_APPWRITE_PROJECT_ID,
    };
  }

  return {
    profile: "cloud",
    isDesktop: false,
    isBrowser: true,
    isMobile: false,
    appwriteEndpoint: import.meta.env.VITE_APPWRITE_ENDPOINT,
    appwriteProjectId: import.meta.env.VITE_APPWRITE_PROJECT_ID,
  };
}
```

### Auth Factory

Siehe `src/lib/auth/createAuthFactory.ts` und `getAuthClient.ts`. UI und Hooks rufen **`getAuthClient()`** auf, nicht `new AppwriteAuthAdapter()` direkt.

`detectRuntime()` — siehe `src/runtime/detect-runtime.ts`:

- Browser-Build mit `VITE_SCRIPTONY_RUNTIME=local` **ohne** Desktop-Shell → Fallback **cloud** (Auth-Bypass verhindern).
- Tauri/Electron erkannt → Default **local** moeglich (T36: produktiv erst nach T38).

## Edge Cases

1. **Desktop-App ohne Runtime Env startet**: Default darf fuer Tauri spaeter `local` sein; fuer Browser bleibt Default `cloud`.
2. **Local User klickt auf Cloud Feature**: App fordert Login erst bei Cloud-Aktion an, nicht beim Start.
3. **Self-hosted Endpoint fehlt**: Runtime darf nicht still auf Cloud fallbacken; sichtbarer Konfigurationsfehler.
4. **Bestehende Cloud-App**: Muss unveraendert weiterlaufen, wenn `VITE_SCRIPTONY_RUNTIME` nicht gesetzt ist.
5. **Mobile/Capacitor**: Wird vorerst als Cloud-Profil behandelt; kein Local Project Storage.

## Akzeptanzkriterien

- [ ] `RuntimeProfile = "local" | "cloud" | "selfHosted"` existiert zentral.
- [ ] `RuntimeConfig` existiert zentral.
- [ ] `detectRuntime()` existiert und hat sichere Defaults.
- [ ] **`AuthClient`** bleibt die einzige Auth-Abstraktion (kein paralleles `AuthService`).
- [ ] `LocalAuthAdapter` liefert stabile Session `local-user` fuer Local Mode.
- [ ] `AppwriteAuthAdapter` bleibt fuer Cloud/Self-hosted funktional unveraendert.
- [ ] `useAuth` / App-Start nutzen `getAuthClient()` + Runtime; Login-Screen wird im Local Mode uebersprungen.
- [ ] App kann im Local Runtime-Profil ohne Login booten.
- [ ] Cloud Runtime verhaelt sich fuer bestehende User unveraendert.
- [ ] Keine UI-Komponente fuehrt direkte Appwrite-/Tauri-/Self-hosted-Erkennung ein.
- [ ] `npm run typecheck` laeuft durch.
- [ ] Shimwrappercheck laeuft durch.

## SOLID / DRY / KISS

- **SRP**: Runtime-Erkennung nur in `src/runtime`, Auth nur in `src/lib/auth/*` Adapters.
- **OCP**: Neue Runtime-Profile koennen spaeter ergaenzt werden, ohne UI-Komponenten umzuschreiben.
- **LSP**: `LocalAuthAdapter` und `AppwriteAuthAdapter` erfuellen `AuthClient`.
- **ISP**: Auth-Interface bleibt klein; keine Storage-/DB-Funktionen im Auth-Service.
- **DIP**: UI haengt an `AuthClient` / `useAuth`, nicht an Appwrite SDK.
- **DRY**: Keine duplizierte Runtime-Erkennung in Komponenten.
- **KISS**: Local Mode bekommt keinen echten lokalen Login; `local-user` reicht fuer MVP.
