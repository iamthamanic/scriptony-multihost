# Scriptony Architecture Refactor Ticket T41 — Self-hosted Appwrite Endpoint verbinden

Stand: 2026-05-23

## Ziel

Scriptony kann pro User einen eigenen **Appwrite Endpoint** verwenden, damit Studios/Teams Scriptony selbst hosten koennen, ohne die Local-only Experience fuer Solo-User zu veraendern.

**Abhaengigkeit:** T34/T35. **Kann parallel zu T40** implementiert werden (Studios ohne Scriptony-Cloud-Sync). Nutzt denselben `AppwriteBackend` + `RuntimeProfile: selfHosted` — kein zweiter Codepfad.

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

Cloud ist optional. Fuer Teams gibt es zwei Zielpfade: Scriptony Cloud oder Self-hosted Appwrite. Self-hosted soll nicht bedeuten, dass Solo-User lokal Appwrite/Docker starten muessen. Es ist ein bewusster Team-/Studio-Modus mit eigenem Server.

## Problem

Wenn Self-hosted nur als Umgebungsvariable oder Dev-Konfiguration existiert, ist es fuer Desktop-User nicht steuerbar. Wenn es global eingebaut wird, kann es Local Mode stoeren. Self-hosted muss als explizites Runtime-/Projektprofil funktionieren.

## Loesung

Self-hosted Verbindung einfuehren:

```text
Settings / Start Screen
  → Self-hosted Server verbinden
  → Endpoint + Project ID eingeben
  → Verbindung testen
  → Login gegen diesen Endpoint
```

Gespeichert wird eine Server-Verbindung, keine global erzwungene Cloud.

```ts
export interface SelfHostedConnection {
  id: string;
  name: string;
  endpoint: string;
  projectId: string;
  createdAt: string;
  lastUsedAt: string | null;
}
```

## User Journey

### Studio User

1. Studio betreibt eigenen Appwrite Server.
2. User startet Scriptony Desktop.
3. Waehlt `Self-hosted Server verbinden`.
4. Gibt Endpoint und Project ID ein.
5. Scriptony testet Verbindung.
6. User loggt sich gegen den eigenen Server ein.
7. Projekte werden aus dem Self-hosted Backend geladen.

### Solo User

1. Startet App.
2. Nutzt lokale Projekte.
3. Sieht Self-hosted nur als optionale Verbindung.
4. Kein Server erforderlich.

## Architektur

```text
RuntimeProfile: selfHosted
  ↓
AppwriteBackend
  ↓
Custom endpoint + projectId
  ↓
Self-hosted Appwrite Server
```

Self-hosted nutzt denselben AppwriteBackend-Code wie Cloud, nur andere RuntimeConfig.

## Beispiele

### Connection Test

```ts
export class SelfHostedConnectionService {
  async testConnection(input: TestSelfHostedConnectionInput): Promise<TestConnectionResult> {
    const client = createAppwriteClient({
      endpoint: input.endpoint,
      projectId: input.projectId,
    });

    try {
      await client.health.get();
      return { ok: true };
    } catch (error) {
      return { ok: false, message: normalizeConnectionError(error) };
    }
  }
}
```

### Runtime Config

```ts
const runtime: RuntimeConfig = {
  profile: "selfHosted",
  isDesktop: true,
  isBrowser: false,
  isMobile: false,
  selfHostedEndpoint: connection.endpoint,
  appwriteProjectId: connection.projectId,
};
```

## Edge Cases

1. **Endpoint nicht erreichbar**: Klare Fehlermeldung, keine Speicherung als aktive Verbindung.
2. **Falsche Project ID**: Auth/Health-Test muss scheitern.
3. **Server-Version inkompatibel**: Warnung mit minimal unterstuetzter Version/Schema-Version.
4. **Mehrere Self-hosted Server**: Verbindungen getrennt speichern.
5. **Local-only Projekt**: Wird nicht automatisch zu Self-hosted hochgeladen.

## Akzeptanzkriterien

- [ ] `SelfHostedConnection` Type existiert.
- [ ] UI-Flow fuer `Self-hosted Server verbinden` existiert oder ist als klarer Shell-Flow angelegt.
- [ ] Endpoint + Project ID koennen eingegeben und validiert werden.
- [ ] Verbindungstest existiert.
- [ ] Self-hosted nutzt AppwriteBackend mit Custom RuntimeConfig.
- [ ] Cloud-Appwrite-Konfiguration bleibt unveraendert.
- [ ] Local Mode bleibt ohne Server nutzbar.
- [ ] Fehler werden sichtbar und verhindern stillen Fallback auf Scriptony Cloud.
- [ ] `npm run typecheck` laeuft durch.
- [ ] Shimwrappercheck laeuft durch.

## SOLID / DRY / KISS

- **SRP**: SelfHostedConnectionService verwaltet nur Server-Verbindungen.
- **OCP**: Weitere Backend Provider koennen spaeter separat ergaenzt werden.
- **LSP**: Self-hosted verwendet dasselbe AppwriteBackend Interface wie Cloud.
- **ISP**: Verbindungstest ist getrennt von Auth, Sync und Projektdaten.
- **DIP**: UI haengt an ConnectionService, nicht an Appwrite SDK.
- **DRY**: Kein zweiter Appwrite-Codepfad; nur andere RuntimeConfig.
- **KISS**: Self-hosted ist optionaler Team-Modus, kein lokaler Desktop-Serverzwang.
