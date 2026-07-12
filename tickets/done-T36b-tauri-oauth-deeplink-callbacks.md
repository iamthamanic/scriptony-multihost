# Scriptony Architecture Refactor Ticket T36b — Tauri OAuth und Deep-Link Callbacks

Stand: 2026-05-23

## Ziel

Cloud- und Self-hosted-Login (insbesondere **OAuth**) funktionieren in der **Tauri Desktop-App** zuverlaessig. Email/Password allein reicht nicht fuer viele Nutzer.

## Abhaengigkeit

- **T36** (Tauri Shell) muss laufen.
- **T34** (`AppwriteAuthAdapter`, Redirect-URLs aus `src/lib/env.ts`).

## Problem

OAuth in WebView scheitert oft an Redirect-URIs, Custom Schemes und Session-Handoff. Ohne dieses Ticket blockiert T36 fuer Cloud-Desktop-Nutzer mit Google/GitHub-Login.

## Loesung

1. **Deep-Link / Custom URL Scheme** fuer Tauri (z. B. `scriptony://auth/callback`) — abgestimmt mit `capacitor.config.ts` / `VITE_AUTH_REDIRECT_URL`.
2. **Appwrite Console:** Redirect-URLs fuer Desktop-Scheme + localhost:3000 eintragen.
3. **`AppwriteAuthAdapter`:** OAuth-Flow fuer Tauri dokumentieren/implementieren (externer Browser oder WebView + Callback-Handler).
4. Optional: `tauri-plugin-deep-link` / `tauri-plugin-shell` fuer Callback.

Nicht in Scope: Local Mode Auth (bleibt `LocalAuthAdapter`).

## Akzeptanzkriterien

- [ ] OAuth Login (mindestens ein Provider) funktioniert in `npm run dev:desktop` oder dokumentierter Workaround mit Known Risk.
- [ ] Redirect-URLs in Docs/README fuer Appwrite Console gelistet.
- [ ] Kein Auth-Bypass im Browser durch Desktop-Scheme allein.
- [ ] Cloud Web-Login bleibt unveraendert.
- [ ] Shimwrappercheck laeuft durch.

## SOLID / DRY / KISS

- **KISS:** Ein Callback-Pfad; wiederverwenden von `getAuthRedirectUrl()` / Capacitor-URL-Helfern wo moeglich (`src/lib/capacitor/platform.ts`).
- **SRP:** T36b nur Auth-Transport; keine Backend-Domain-Logik.
