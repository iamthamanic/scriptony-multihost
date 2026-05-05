# Architecture Refactor – Ziel-Domaenen

Stand: 2026-05-05

Dieses Dokument enthaelt die Ziel-Domaenen fuer die Architektur-Refactor-Phasen.
Es wird von `docs/scriptony-architecture-refactor-master.md` referenziert.

**T20 Verifizierungsmarker:** `ARCH-REF-T20-DONE` (Zielmodell `scriptony-storage` und Grenze zu `scriptony-assets` / `scriptony-auth` in `docs/backend-domain-map.md` und hier verankert.)

**T21 Verifizierungsmarker (Dokumentation):** `ARCH-REF-T21-DOC` — Zielmodell `scriptony-collaboration`, Access-Helper-Vertrag und Grenze zu `scriptony-auth` in `docs/backend-domain-map.md` und hier verankert. Gesamt-Ticket **T21** bleibt in der Master-Tabelle **todo**, bis der volle Shim-Gate gruen ist (siehe Done Report).

---

## scriptony-storage

scriptony-storage besitzt physische Speicherziele, Storage Provider, Storage-OAuth, Storage-Verbindungen, Storage Objects, Sync, Import und Export.

**Zweck:**
scriptony-storage beantwortet:
- Wo liegt eine Datei physisch?
- Welcher Storage Provider wird genutzt?
- Welcher OAuth-/Provider-Account ist verbunden?
- Welches Storage Target gilt fuer User, Organisation oder Projekt?
- Welche externe File-ID gehoert zu welchem Asset?
- Ist eine Datei synchronisiert?
- Wie wird ein Projekt als JSON/Dateistruktur exportiert oder importiert?

**Enthaelt:**
- Storage Provider (Appwrite Storage, Google Drive, Dropbox, OneDrive)
- Storage Provider OAuth (z. B. Google Drive: **Storage-Kopplung**, nicht Scriptony-Login; siehe `docs/backend-domain-map.md` Abschnitt T20)
- Storage Connections
- Storage Targets
- Storage Objects
- External File Mapping
- Sync Status
- Import/Export
- Project Snapshot Storage
- Storage Health

**Datenmodelle:**

```typescript
// storage_connections
{
  id: string,
  user_id: string,
  provider: 'appwrite' | 'google_drive' | 'dropbox' | 'onedrive',
  status: 'active' | 'expired' | 'revoked',
  scopes: string[],
  access_token_ref: string,
  refresh_token_ref: string,
  expires_at: datetime,
  metadata: object,
  created_at: datetime,
  updated_at: datetime
}

// storage_targets
{
  id: string,
  owner_type: 'user' | 'organization' | 'project',
  owner_id: string,
  provider: string,
  connection_id: string,
  root_path: string,
  format: 'flat' | 'hierarchical',
  status: 'active' | 'paused' | 'error',
  metadata: object,
  created_at: datetime,
  updated_at: datetime
}

// storage_objects
{
  id: string,
  asset_id: string,        // Verweis auf scriptony-assets
  project_id: string,
  provider: string,
  connection_id: string,
  external_file_id: string,
  bucket_id: string,
  path: string,
  checksum: string,
  size: number,
  mime_type: string,
  sync_status: 'synced' | 'pending' | 'error' | 'conflict',
  last_synced_at: datetime,
  metadata: object,
  created_at: datetime,
  updated_at: datetime
}
```

**Grenze zu scriptony-assets:**
- **scriptony-assets** = fachliche Asset-Metadaten (Dieses Asset ist ein TTS-Audio fuer Script Block X)
- **scriptony-storage** = physische Dateiablage (Diese Datei liegt in Google Drive mit external_file_id abc123)

**Regel:**
Assets duerfen nicht dauerhaft Google-Drive-OAuth, Dropbox-OAuth oder Provider-Token-Logik enthalten.
Storage darf nicht die fachliche Asset-Bedeutung besitzen.

**Spaetere Routen:**
- `GET /storage/providers`
- `POST /storage/providers/:provider/oauth/start`
- `GET /storage/providers/:provider/oauth/callback`
- `GET /storage/targets`
- `POST /storage/targets`
- `POST /storage/write`
- `POST /storage/read`
- `POST /storage/sync`
- `POST /storage/export-project`
- `POST /storage/import-project`

---

## scriptony-collaboration

scriptony-collaboration besitzt Projektfreigaben, Mitglieder, Rollen, Einladungen, Organisationen/Workspaces und Access Checks.

**Wichtig:** Direkte Projektfreigabe ohne Organisation muss moeglich sein.

**Zwei Kollaborationsmodi:**

1. **Direct Project Sharing**: User A teilt ein Projekt direkt mit User B.
2. **Organization / Workspace Sharing**: Ein Projekt gehoert einer Organisation. Organisationsmitglieder erhalten Zugriff gemaess Rolle.

**Datenmodelle:**

```typescript
// projects (Erweiterung)
{
  id: string,
  owner_type: 'user' | 'organization',
  owner_id: string,        // user_id oder organization_id
  created_by: string,
  title: string,
  project_type: string,
  visibility: 'private' | 'shared' | 'public',
  created_at: datetime,
  updated_at: datetime
}

// project_members
{
  id: string,
  project_id: string,
  user_id: string,
  role: 'owner' | 'editor' | 'viewer',
  status: 'active' | 'pending',
  invited_by: string,
  created_at: datetime,
  updated_at: datetime
}

// project_invites
{
  id: string,
  project_id: string,
  email: string,
  role: 'editor' | 'viewer',
  token_hash: string,
  status: 'pending' | 'accepted' | 'rejected' | 'expired',
  invited_by: string,
  expires_at: datetime,       // Pflicht; Default z. B. 7 Tage nach created_at
  accepted_at: datetime | null, // gesetzt bei Annahme (einmaliger Token)
  created_at: datetime,
  updated_at: datetime
}

// organization_members
{
  id: string,
  organization_id: string,
  user_id: string,
  role: 'owner' | 'admin' | 'editor' | 'viewer',
  status: 'active' | 'pending',
  invited_by: string,
  created_at: datetime,
  updated_at: datetime
}

// organization_invites
{
  id: string,
  organization_id: string,
  email: string,
  role: string,
  token_hash: string,
  status: 'pending' | 'accepted' | 'rejected' | 'expired',
  invited_by: string,
  expires_at: datetime,
  created_at: datetime,
  updated_at: datetime
}
```

**Access-Helper:**

```typescript
canReadProject(userId: string, projectId: string): Promise<boolean>
canEditProject(userId: string, projectId: string): Promise<boolean>
canManageProject(userId: string, projectId: string): Promise<boolean>
```

**RBAC (verbindlich):**

| Helper | Bedeutung | Ziel-Rollen / Regeln |
|--------|-----------|----------------------|
| `canReadProject` | Projekt lesen (Struktur, Metadaten, ggf. geteilte Inhalte) | `project_members`: viewer, editor, owner; Org: viewer+; Owner-User/Org via `owner_type`/`owner_id` |
| `canEditProject` | Inhalte bearbeiten (Scripts, Assets je nach Domain), keine Mitgliederverwaltung | `project_members`: editor, owner; Org-Mitglieder mit Schreibrecht gemaess Policy |
| `canManageProject` | Mitgliederverwaltung, Einladungen, Projekt loeschen/Owner wechseln | **Nur** `project_members.role === 'owner'` oder explizite Admin-Policy — **nie** `return canReadProject(...)` |

**`owner` vs `admin`:** Auf **Projekt**-Ebene gibt es `owner` (volle Kontrolle ueber das Projekt). **`admin`** ist vor allem fuer **Organisationen** (`organization_members`) gedacht (Mitglieder einladen, Rollen setzen). Projekt-Ebene kann spaeter `admin` als Delegation definieren; bis dahin: Management = Projekt-**owner** (+ ggf. Org-Owner laut Policy).

**Anti-Pattern:** `canManageProject` darf **nicht** an `canReadProject` delegieren — sobald Lesen fuer Viewer/Org breiter wird, waere das eine **Authorization-Eskalation**.

**Hinweis (bestehender Code):** `functions/scriptony-script/_shared/access.ts` nutzt fuer **MVP** `canEditProject` → `canReadProject`. Sobald `project_members` existiert, muss **canEdit** auf Rollen **editor** / **owner** (nicht **viewer**) eingeschraenkt werden — siehe Tabelle oben.

**Eingabevalidierung:** Alle drei Helper validieren am Eingang `userId` und `projectId` (nicht leer, erwartetes Format); in Implementierungen **Zod**-Schemas parallel zu Route-Handlern (`ProjectIdSchema` aus `functions/_shared/validation.ts` wo vorhanden).

**Initiale Implementierung (Single-User):**
```typescript
// Nur Ersteller/in — drei Helper duerfen dieselbe primitive Pruefung nutzen,
// aber nicht canManage → canRead verkettet sein.
```

**Ziel-Implementierung (Multi-User) — skizziert:**
```typescript
// canReadProject: Viewer-Kreis + Owner/Org-Zugehoerigkeit
// canEditProject: hasProjectRole(..., ['owner','editor']) || orgEditor(...)
// canManageProject: hasProjectRole(..., ['owner']) || orgAdminForProject(...)  // explizit, ohne canReadProject aufzurufen
```

**Einladungen / API (Security-Ziele fuer `scriptony-collaboration`):**

- Jede Einladung: **expires_at** (Default z. B. 7 Tage), **einmaliger Token** (Hash gespeichert), Status `expired` nach Ablauf.
- **Rate-Limiting** (Ziel): z. B. max. **10** Einladungen pro Stunde pro **invited_by** und **project_id** (konfigurierbar).
- Annahme setzt **accepted_at** und invalidiert den Token.

**Tests (Ziel):** Unit-Tests pro Helper mit Matrix: Owner, Editor, Viewer, kein Mitglied, abgelaufene Einladung; keine Assertions die `canManage` ueber `canRead` simulieren.

**Spaetere Routen:**
- `GET /collaboration/projects/:projectId/members`
- `POST /collaboration/projects/:projectId/invites`
- `PATCH /collaboration/projects/:projectId/members/:userId`
- `DELETE /collaboration/projects/:projectId/members/:userId`
- `POST /collaboration/invites/:inviteId/accept`
- `POST /collaboration/invites/:inviteId/reject`
- `GET /collaboration/organizations`
- `POST /collaboration/organizations`
- `POST /collaboration/access/check`

**Grenze zu scriptony-auth:**
- **scriptony-auth** = Identitaet, Signup, Login, Account Basics
- **scriptony-collaboration** = Wer darf in welchem Projekt welche Aktionen ausfuehren?

**Current vs. future (Organisationen):**
- **Heute:** Organisationen werden ueber `scriptony-auth` exponiert (`/organizations`, `/organizations/:id` in `functions/scriptony-auth/appwrite-entry.ts`). Das ist **Kompatibilitaet**, keine langfristige SRP-Loesung.
- **Ziel:** Mitgliedschafts-Lebenszyklus, Einladungen und projektbezogene Berechtigung liegen bei `scriptony-collaboration`; `scriptony-auth` bleibt ohne Geschaeftslogik zu Projektrollen.
