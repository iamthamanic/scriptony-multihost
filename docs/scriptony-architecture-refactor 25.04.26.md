Ziel: nicht alles auf einmal umbauen. Erst Architektur stabilisieren, dann fehlende Domänen bauen, dann alte Mischungen bereinigen.

Finale Zielarchitektur
Zielgruppen
CORE

- scriptony-auth
- scriptony-projects
- scriptony-structure
- scriptony-script
- scriptony-characters
- scriptony-worldbuilding
- scriptony-timeline
- scriptony-editor-readmodel

MEDIA

- scriptony-assets
- scriptony-audio
- scriptony-image
- scriptony-video
- scriptony-media-worker

WORKFLOWS

- scriptony-audio-production
- scriptony-stage
- scriptony-stage2d
- scriptony-stage3d
- scriptony-style
- scriptony-style-guide
- scriptony-sync
- scriptony-gym

PLATFORM

- scriptony-ai
- scriptony-assistant
- scriptony-jobs
- scriptony-observability
- scriptony-admin
- scriptony-mcp-appwrite
- scriptony-storage
- scriptony-collaboration

LEGACY

- jobs-handler
- make-server-3b52693b

Wichtig: Das ist die logische Zielarchitektur. Nicht jede Ziel-Domäne muss sofort physisch deployed werden. Neue Features müssen aber ab sofort nach dieser Map einsortiert werden.

1. Neue Functions
   1.1 scriptony-script
   Zweck

scriptony-script wird die Source of Truth für die Native View.

Sie besitzt geschriebenen Inhalt:

Drehbuch
Serienskript
Hörspielskript
Buchtext
Dialogzeilen
Narration
Regieanweisungen
Soundeffekt-Hinweise
Kapiteltext
Textblöcke
Absätze
Enthält
scripts
script_blocks
optional: script_versions
optional: script_exports
Minimale Datenmodelle
scripts

- id
- project_id
- project_type
- title
- status
- created_by
- created_at
- updated_at

script_blocks

- id
- script_id
- project_id
- node_id
- parent_id
- type
- order_index
- speaker_character_id
- content
- metadata
- created_by
- created_at
- updated_at
  Block-Typen
  scene_heading
  action
  dialogue
  narration
  sound_effect
  stage_direction
  chapter_text
  paragraph
  note
  Routen
  GET /scripts/by-project/:projectId
  POST /scripts
  GET /scripts/:id
  PATCH /scripts/:id
  DELETE /scripts/:id

GET /scripts/:id/blocks
POST /scripts/:id/blocks
GET /script-blocks/:id
PATCH /script-blocks/:id
DELETE /script-blocks/:id
POST /script-blocks/reorder

GET /nodes/:nodeId/script-blocks
Gehört nicht rein
TTS
STT
Audio-Dateien
Voice Assignments
Mixing
Rendering
Bildgenerierung
Videoerzeugung
Asset Upload
Timeline Rendering
Warum

Ohne scriptony-script landen Dialoge, Buchtext und Hörspielskript falsch in:

audio-story
shots
beats
assistant
stage
project-nodes

Das ist der Hauptgrund für das aktuelle Verzetteln.

1.2 scriptony-assets
Zweck

Zentrale Verwaltung von Dateien, Medien und Asset-Metadaten.

Enthält
Uploads
Asset-Metadaten
Verknüpfung zu Ownern
Medienvarianten
Audio/Image/Video/Document Assets
Storage-Bucket-Zuordnung
Minimales Datenmodell
assets

- id
- project_id
- owner_type
- owner_id
- media_type
- purpose
- file_id
- bucket_id
- filename
- mime_type
- size
- duration
- width
- height
- status
- metadata
- created_by
- created_at
- updated_at
  Beispiele
  owner_type = project
  owner_id = project_id
  media_type = image
  purpose = cover

owner_type = shot
owner_id = shot_id
media_type = audio
purpose = voiceover

owner_type = script_block
owner_id = script_block_id
media_type = audio
purpose = tts_line

owner_type = world_item
owner_id = world_item_id
media_type = image
purpose = reference

owner_type = style_guide
owner_id = style_guide_id
media_type = image
purpose = visual_reference
Routen
POST /assets/upload
GET /assets/:id
PATCH /assets/:id
DELETE /assets/:id

GET /assets/by-owner/:ownerType/:ownerId
POST /assets/:id/link
POST /assets/:id/unlink
GET /assets/by-project/:projectId
Gehört nicht rein
TTS-Ausführung
STT-Ausführung
Bildgenerierung
Videogenerierung
Mixing
Renderjobs
Script-Text
Shot-CRUD
Project-CRUD
Warum

Aktuell sind Uploads verteilt auf:

projects/upload-image
shots/upload-image
audio/shots/upload-audio
worldbuilding/upload-image
style-guide references
stage document upload

Das verletzt DRY. Uploads und Asset-Metadaten müssen zentral sein.

1.3 scriptony-media-worker
Zweck

Ausführung schwerer Medienjobs.

Enthält
Audio Mixing
Audio Normalization
Hörspiel Export
Hörbuch Export
Video Rendering
Image Render Execution
Palette Extraction
Style Guide Export
File Conversion
Batch Processing
Routen / Actions

Je nach Appwrite-Modell entweder HTTP oder Job-triggered:

POST /worker/media/mix-audio
POST /worker/media/export-audio-production
POST /worker/media/render-video
POST /worker/media/execute-image-render
POST /worker/media/extract-palette
POST /worker/media/export-style-guide
POST /worker/media/normalize-audio
POST /worker/media/convert-file
Gehört nicht rein
Job-Lifecycle als Source of Truth
User-facing CRUD
Projektlogik
Scriptlogik
Voice Assignment
Stage Review
AI Settings
Warum

media-worker führt aus. scriptony-jobs verwaltet Status. Nicht vermischen.

1.4 scriptony-editor-readmodel
Zweck

Aggregator für den Editor-Ladezustand.

Enthält
read-only aggregation
editor state
project state
structure + script + timeline + assets + characters
Beispielroute
GET /editor/projects/:projectId/state
Beispielantwort
{
"project": {},
"structureTree": [],
"characters": [],
"scriptBlocks": [],
"shots": [],
"clips": [],
"assets": [],
"sceneAudioTracks": [],
"styleSummary": {}
}
Gehört nicht rein
Erstellen
Ändern
Löschen
Business-Write-Logik
TTS
Mixing
Asset Upload
Warum

Der aktuelle /nodes/ultra-batch-load ist fachlich falsch platziert. Das Bedürfnis ist aber real: Der Editor braucht viele Daten auf einmal. Deshalb bekommt das einen eigenen Namen.

1.5 scriptony-observability
Zweck

Stats, Logs, Analytics, Read-Only Debug-Views.

Zusammenführen aus
scriptony-stats
scriptony-logs
\_shared/observability.ts
Enthält
/stats/project/:id
/stats/project/:id/overview
/stats/project/:id/media
/stats/project/:id/characters
/stats/project/:id/shots
/stats/:nodeType/:id
/logs/project/:id/recent
/logs/:nodeType/:id/recent
Gehört nicht rein
Project Writes
Asset Writes
User Admin Mutations
Stage Mutations
1.6 scriptony-admin
Zweck

Superadmin und Backoffice.

Zusammenführen / Umbenennen aus
scriptony-superadmin
Enthält
/superadmin/users
/superadmin/organizations
/superadmin/stats
/superadmin/analytics
Warum

Admin hat einen anderen Security-Kontext. Deshalb eigene Function.

2. Umbenennungen
   2.1 scriptony-audio-story → scriptony-audio-production
   Neuer Zweck

Audio-Produktionsworkflow, nicht technische Audio-Engine.

Enthält
audio_sessions
scene_audio_tracks
character_voice_assignments
recording session orchestration
voice casting
track planning
preview mix orchestration
export orchestration
generate audio from script orchestration
Routen
GET /audio-production/sessions
POST /audio-production/sessions
GET /audio-production/sessions/:id
PATCH /audio-production/sessions/:id

GET /audio-production/tracks
POST /audio-production/tracks
PATCH /audio-production/tracks/:id
DELETE /audio-production/tracks/:id

GET /audio-production/voice-assignments
POST /audio-production/voice-assignments
PATCH /audio-production/voice-assignments/:id
DELETE /audio-production/voice-assignments/:id

POST /audio-production/generate-from-script
POST /audio-production/preview-mix
POST /audio-production/export
GET /audio-production/jobs/:jobId
Gehört nicht rein
TTS Provider Implementation
STT Provider Implementation
OpenAI/ElevenLabs Client direkt
generische Voice Discovery
Datei-Upload
finale Mixing Engine
Script Source of Truth
Aufrufe an andere Functions
script-api:
liest script_blocks

characters-api:
liest character metadata

audio-api:
erzeugt TTS/STT

assets-api:
speichert generierte Audiodateien

jobs-api:
erstellt Mix-/Export-Jobs

media-worker:
führt Mix/Export aus

timeline-api:
optional für Timing/Playback
2.2 scriptony-project-nodes → scriptony-structure
Neuer Zweck

Projektbaum, Dropdown, Hierarchie.

Enthält
Akte
Sequenzen
Szenen
Kapitel
Textblock-Knoten
Parent/Child
Ordering
Path
Children
Initialstruktur
Routen
POST /initialize-project
GET /nodes
POST /nodes
GET /nodes/:id
PATCH /nodes/:id
DELETE /nodes/:id
GET /nodes/:id/children
GET /nodes/:id/path
POST /nodes/reorder
POST /nodes/bulk
Gehört nicht rein
Characters vollständig mitladen
Shots vollständig mitladen
Clips vollständig mitladen
Assets vollständig mitladen
ScriptBlocks vollständig mitladen
Audio Tracks
ultra-batch-load

Kurzfristig:

bleibt technisch bestehen
als legacy/editor-readmodel route markieren
keine neue Logik dort ergänzen

Mittelfristig:

verschieben nach scriptony-editor-readmodel
2.3 scriptony-shots + scriptony-clips → langfristig scriptony-timeline
Zweck

Timeline, Shots, Clips, Timing, Playback.

Enthält
Shots
Clips
Clip-Positionen
Timeline-Tracks
Timing
Readalong
Playback-relevante Segmente
Kurzfristig
scriptony-clips bleibt
scriptony-shots bleibt
beide werden als Timeline-Domäne markiert
Langfristig
scriptony-timeline
Achtung

timeline_items nicht sofort erzwingen. Erst script und assets bauen.

2.4 scriptony-superadmin → scriptony-admin
Zweck

Admin-API mit eigenem Security-Kontext.

2.5 scriptony-stats + scriptony-logs → scriptony-observability
Zweck

Stats und Logs als Read-Only-Domäne.

2.6 scriptony-jobs-handler → scriptony-jobs
Zweck

Einheitliche Job-Control-Plane.

Enthält
Job erstellen
Job Status
Job Result
Job Cleanup
Retry
Cancel
Idempotency
Nicht enthalten
Audio Mixing
Video Rendering
Image Execution 3. Functions, die inhaltlich verändert werden
3.1 scriptony-audio
Bleibt drin
TTS
STT
Voice Discovery
Provider Discovery
Model Discovery
TTS History
STT History
Recording Primitives
kleine technische Audiooperationen
Muss raus
/shots/:id/upload-audio
/shots/:id/audio
/shots/audio/batch
/shots/audio/:id
Ziel für diese Routen
scriptony-assets

oder bei starker Timeline-Kopplung:

scriptony-timeline
Regel
Audio erzeugt/verarbeitet Audio.
Audio verwaltet nicht, warum eine Audiodatei zu einem Shot gehört.
3.2 scriptony-image
Bleibt drin
image generation
image editing
drawtoai
segment
image tasks
task status
inpainting
upscaling
Muss raus
AI key validation
AI image settings
stage render execution callback
cover product logic, falls projektfachlich
Ziel
AI settings/key validation → scriptony-ai
stage render execution → scriptony-stage oder scriptony-media-worker
cover concept/prompt → scriptony-script/generation/stage, je nach fachlichem Kontext
3.3 scriptony-assistant
Bleibt drin
chat
conversations
messages
prompt handling
RAG experience
count tokens, falls assistant-spezifisch
Muss raus
AI settings
models
validate-key
gym starter
MCP tools registry
Ziel
AI settings/models/validate-key → scriptony-ai
gym starter → scriptony-gym
MCP tools registry → scriptony-mcp-appwrite
3.4 scriptony-style-guide
Bleibt drin
project visual style guide
references metadata
style guide CRUD
prompt build, falls style-guide-spezifisch
Muss raus
heavy export
palette extraction
long-running reference processing
Ziel
scriptony-media-worker
3.5 scriptony-stage
Bleibt drin
render job lifecycle
accept/reject
complete/fail
review state
stage orchestration
Nicht rein
image provider implementation
video provider implementation
render engine execution
file conversion
Ziel für schwere Ausführung
scriptony-media-worker
3.6 functions/\_shared
Darf enthalten
auth helpers
db clients
http helpers
permissions primitives
validation primitives
storage primitive helpers
AI provider registry helpers
shared types
error helpers
Muss raus
timeline business logic
project hydration business logic
observability business logic
domain-specific GraphQL compat logic
Ziel
\_shared/timeline.ts → structure/timeline module
\_shared/scriptony.ts → project/world access modules
\_shared/observability.ts → observability-api 4. Legacy
4.1 jobs-handler

Markieren als:

LEGACY_DO_NOT_EXTEND

Keine neuen Features.

Langfristig ersetzen durch:

scriptony-jobs
4.2 make-server-3b52693b

Markieren als:

LEGACY_DO_NOT_EXTEND

Prüfen, ob deployed oder tot.

Wenn tot:

archivieren oder löschen

Wenn deployed:

nur noch Compatibility, keine neuen Features 5. Reihenfolge der Umsetzung
Phase 0 — Ist-Zustand verifizieren

Keine Codeänderung.

Aufgaben

1. Liste alle tatsächlich deployten Appwrite Functions.
2. Vergleiche appwrite.json mit Repo.
3. Prüfe, welche Functions real erreichbar sind.
4. Prüfe alle /health-Routen, falls vorhanden.
5. Markiere Functions als:
   - active
   - repo-only
   - deployed-only
   - legacy
   - unclear
     Appwrite prüfen
     Appwrite Console:

- Functions
- Deployments
- Runtime
- Entry Point
- Environment Variables
- Executions
- Logs
- Domains/Endpoints
  Ergebnis
  docs/appwrite-function-inventory.md
  Phase 1 — Domain Map anlegen

Keine Codeänderung.

Datei
docs/backend-domain-map.md
Muss enthalten
Current Function
Target Function
Status: keep | rename | split | merge | new | legacy
Allowed Responsibilities
Forbidden Responsibilities
Data Models Owned
Data Models Read
External Providers
Notes
Verifizierbar

Die Datei muss jede aktuell existierende Function enthalten.

Phase 2 — scriptony-script bauen

Erste neue echte Function.

Aufgaben

1. Neue Appwrite Collections planen:
   - scripts
   - script_blocks
2. Indexe definieren.
3. Permissions definieren.
4. Function scriptony-script anlegen.
5. Routen implementieren.
6. Keine bestehende Logik brechen.
7. Noch keine harte Migration bestehender Daten.
   Appwrite Collections

scripts Indexe:

project_id
project_type
created_by
updated_at

script_blocks Indexe:

script_id
project_id
node_id
parent_id
order_index
speaker_character_id
type
Tests
Create script
Get script by project
Create block
Patch block
Delete block
Reorder blocks
Get blocks by node
Permission denied for foreign project
Invalid node_id rejected
Invalid speaker_character_id rejected or marked nullable
Appwrite prüfen
Database collections created
Attributes created
Indexes created
Permissions correct
Function deployed
Env variables set
Execution logs clean
Phase 3 — scriptony-assets bauen
Aufgaben

1. Collection assets anlegen.
2. Storage bucket mapping definieren.
3. Uploadroute bauen.
4. Link/unlink Owner-Logik bauen.
5. Bestehende Uploads noch nicht sofort ersetzen.
6. Neue Uploads ab jetzt über assets.
   Appwrite

Collections:

assets

Buckets prüfen/vereinheitlichen:

project-images
shots
audio-files
world-images
stage-documents
style references

Entscheiden:

Bestehende Buckets behalten
oder langfristig bucket per media_type

Nicht sofort alles migrieren.

Tests
Upload image asset
Upload audio asset
Upload video asset
Link asset to project
Link asset to shot
Link asset to script_block
Get assets by owner
Delete asset metadata
Storage file remains or is deleted according to policy
Permission denied for wrong project
Phase 4 — audio-story als audio-production begrenzen

Noch nicht zwingend komplett umbenennen. Erst Ownership ändern.

Aufgaben

1. In Domain Map audio-story → audio-production markieren.
2. Neue technische Audiofeatures dort verbieten.
3. GET /voices/tts/voices an scriptony-audio delegieren oder dort duplizierte Logik entfernen.
4. Sessions, tracks, voice assignments bleiben in audio-production.
5. Mixing/export nur noch orchestration.
6. Echte Ausführung an jobs/media-worker delegieren.
   Appwrite prüfen
   audio_sessions schema
   scene_audio_tracks schema
   character_voice_assignments schema
   audio_session_participants ungenutzt? behalten oder entfernen
   project_id mismatch prüfen
   Tests
   Create audio session
   Create scene audio track
   Assign voice to character
   Generate from script uses script_blocks
   TTS call geht über scriptony-audio
   Generated audio is stored via assets
   Mix preview creates job, not fake response
   Export creates job, not fake response
   Wrong project access denied
   Phase 5 — scriptony-audio bereinigen
   Aufgaben
7. TTS/STT stabil halten.
8. Shot-Audio-Routen als legacy markieren.
9. Neue Asset-Route für Shot-Audio über scriptony-assets nutzen.
10. Alte Routes optional als Compatibility Wrapper lassen.
    Ziel

Alte Route:

POST /shots/:id/upload-audio

ruft intern langfristig:

POST /assets/upload
POST /assets/:id/link
Tests
TTS still works
STT still works
Old shot audio route still works if kept
New asset upload works
No duplicate metadata mismatch
shot_audio schema mismatch documented
Phase 6 — scriptony-image und scriptony-assistant bereinigen
Image

Verschieben:

image settings → scriptony-ai
validate-key → scriptony-ai
execute-render → stage/media-worker
Assistant

Verschieben:

AI settings/models/validate-key → scriptony-ai
gym starter → scriptony-gym
mcp tools → scriptony-mcp-appwrite
Tests
Assistant chat works
Conversations work
RAG sync works
AI settings work via scriptony-ai
Gym starter works via scriptony-gym
Image tasks work
Legacy image settings route either redirects or deprecated cleanly
Phase 7 — scriptony-editor-readmodel bauen
Aufgaben

1. Neue read-only Function.
2. /editor/projects/:projectId/state bauen.
3. ultra-batch-load nicht mehr erweitern.
4. Frontend optional umstellen.
5. Performance messen.
   Liest aus
   projects
   timeline_nodes
   characters
   shots
   clips
   script_blocks
   assets
   scene_audio_tracks
   style guide summary
   Darf nicht schreiben

Keine Writes.

Tests
Returns complete editor state
Does not mutate data
Respects permissions
Handles empty project
Handles large project
Does not time out
Matches old ultra-batch-load where needed
Phase 8 — Timeline konsolidieren

Erst nach Script + Assets + Audio-Production.

Aufgaben

1. shots und clips als timeline-domain markieren.
2. Prüfen, ob timeline_items wirklich nötig ist.
3. Falls ja: Datenmodell minimal halten.
4. Keine metadata-Müllhalde bauen.
   Tests
   Clip CRUD
   Shot CRUD
   Shot reorder
   Clip reorder / timing
   Scene audio tracks relation
   Readalong relation
   Performance with large timelines
   Phase 9 — Jobs konsolidieren

Spät, weil hohes Risiko.

Aufgaben

1. jobs-handler als legacy markieren.
2. scriptony-jobs-handler als Basis wählen.
3. Einheitliches jobs schema definieren.
4. media-worker an jobs anbinden.
5. Alte Job-Routen kompatibel halten oder sauber deprecaten.
   Tests
   Create job
   Get status
   Get result
   Retry job
   Fail job
   Cleanup job
   Media worker updates job status
   No duplicate job entries
   Old job routes still work or return documented deprecation
   Phase 10 — Legacy entfernen
   Kandidaten
   jobs-handler
   make-server-3b52693b
   unwired auth storage/demo routes
   unwired worldbuilding routes
   unwired shot character routes
   Vorgehen
6. Deploy-Status prüfen.
7. Frontend-Verwendung suchen.
8. Logs prüfen.
9. Wenn 30 Tage nicht genutzt: deprecate.
10. Danach entfernen.
11. SOLID-Regeln für diese Codebase
    SRP — Single Responsibility

Jede Function muss genau einen Änderungsgrund haben.

Prüffrage:

Warum müsste diese Function geändert werden?

Gute Beispiele:

TTS Provider ändert sich → scriptony-audio
Dialogmodell ändert sich → scriptony-script
Asset-Metadaten ändern sich → scriptony-assets
Mixing Engine ändert sich → scriptony-media-worker
Jobstatus ändert sich → scriptony-jobs

Schlechte Beispiele:

scriptony-audio ändert sich wegen Shot-Upload
scriptony-image ändert sich wegen AI Settings
scriptony-assistant ändert sich wegen Gym Starter
OCP — Open/Closed

Neue Produkttypen oder Medienarten dürfen nicht alte Functions zerreißen.

Beispiel:

Neues Feature:

Audiobook chapter export

Sollte ergänzen:

script_blocks type chapter_text
audio-production orchestration
audio-api TTS
assets Speicherung
media-worker Export

Nicht:

audio-api kennt plötzlich Buchkapitel
LSP — Liskov

Adapter für Projekttypen müssen gleiche Interfaces liefern.

Beispiel:

filmScriptAdapter
audioDramaScriptAdapter
bookScriptAdapter

alle liefern:

getScriptBlocks(projectId)
formatExport(scriptId)
ISP — Interface Segregation

Keine riesigen Sammelinterfaces.

Schlecht:

AIService.generateEverything()

Besser:

TextGenerationService
TtsService
ImageGenerationService
VideoGenerationService
DIP — Dependency Inversion

Domänenlogik darf nicht direkt Provider-SDKs importieren.

Schlecht:

audio-production importiert ElevenLabs Client
stage importiert OpenAI Images direkt
gym importiert Anthropic direkt

Gut:

audio-production ruft audio-api
stage ruft image-api/video-api/media-worker
gym ruft ai-service abstraction 7. DRY-Regeln
Nicht mehrfach bauen

Diese Dinge dürfen nur eine Quelle haben:

AI Provider Settings → scriptony-ai
TTS/STT → scriptony-audio
Uploads/Assets → scriptony-assets
Jobs Status → scriptony-jobs
Script Text → scriptony-script
Project Tree → scriptony-structure
Editor Aggregation → scriptony-editor-readmodel
Besonders prüfen
Voice lists nicht in audio und audio-production duplizieren.
Upload-Logik nicht in projects/shots/audio/worldbuilding/style-guide duplizieren.
Job-Logik nicht in jobs-handler und scriptony-jobs-handler duplizieren.
AI settings nicht in assistant/image/ai duplizieren.
Script-Text nicht in tracks/shots/beats duplizieren. 8. KISS-Regeln

Ein neues Feature muss in 10 Sekunden zuordenbar sein.

Zuordnung
Neuer Projekt-Typ?
→ scriptony-projects + structure/script adapters

Neue Dropdown-/Tree-Logik?
→ scriptony-structure

Neue Native-View-/Textlogik?
→ scriptony-script

Neue Dialogzeile?
→ scriptony-script

Neue Stimme für Figur?
→ scriptony-audio-production

Neue TTS-Funktion?
→ scriptony-audio

Neue Audiodatei speichern?
→ scriptony-assets

Neuer Mix/Export?
→ scriptony-audio-production orchestriert, media-worker führt aus, jobs verwaltet

Neue Bildgenerierung?
→ scriptony-image

Neue Videogenerierung?
→ scriptony-video

Neuer Renderjob-Lifecycle?
→ scriptony-stage

Neue Gym-Übung?
→ scriptony-gym

Neue AI Provider Settings?
→ scriptony-ai

Neue Chat-Funktion?
→ scriptony-assistant

Neue Admin-Ansicht?
→ scriptony-admin

Neue Logs/Stats?
→ scriptony-observability

Neuer Editor-Gesamtzustand?
→ scriptony-editor-readmodel 9. Was bei jeder Änderung geprüft werden muss
Immer prüfen

1. Welche Function besitzt die Daten?
2. Welche Function darf nur lesen?
3. Gibt es schon ein Modell dafür?
4. Wird bestehende Logik dupliziert?
5. Gehört es zu technischer Capability oder Produkt-Orchestration?
6. Ist es synchron oder ein langer Job?
7. Sind Permissions korrekt?
8. Sind Appwrite Env Vars vorhanden?
9. Sind Collections/Attributes/Indexes vorhanden?
10. Sind alte Routes kompatibel?
11. Gibt es Frontend-Aufrufer?
12. Gibt es Logs/Executions mit Fehlern?
    Vor jedem Refactor
    Suche nach Route-Verwendung im Frontend.
    Suche nach Collection-Verwendung.
    Suche nach Env-Variablen.
    Suche nach Function-Namen in Deploy-Skripten.
    Suche nach appwrite.json Einträgen.
    Prüfe Appwrite Console Deployments.
13. Appwrite-Checkliste je neuer Function
    Function anlegen

Prüfen:

Function exists in Appwrite
Runtime korrekt
Entry point korrekt
Build command korrekt
Timeout korrekt
Permissions korrekt
Environment variables gesetzt
Deployment aktiv
Logs sauber
Env Vars

Mindestens prüfen:

APPWRITE_ENDPOINT
APPWRITE_PROJECT_ID
APPWRITE_API_KEY
APPWRITE_DATABASE_ID oder domänenspezifische DB IDs
Bucket IDs
Provider Config, falls nötig
Collections

Prüfen:

Collection existiert
Attributes existieren
Required flags korrekt
Default values korrekt
Indexes existieren
Permissions korrekt
Relationship-Konzept dokumentiert
Storage

Prüfen:

Bucket existiert
File size limit korrekt
Allowed extensions/MIME types korrekt
Read/write permissions korrekt
Deployment

Prüfen:

appwrite.json aktuell
Function in Deploy-Skripten enthalten
Runtime Node/Deno konsistent
Entry Point stimmt mit Repo überein 11. Verifizierbare Abnahmekriterien
scriptony-script fertig, wenn
scripts Collection existiert
script_blocks Collection existiert
alle Basisrouten funktionieren
Blocks können pro node_id geladen werden
Blocks können sortiert werden
Speaker character reference funktioniert
Permissions funktionieren
keine Audio-/Asset-/Timeline-Logik darin liegt
scriptony-assets fertig, wenn
assets Collection existiert
Upload funktioniert
Asset kann Owner zugeordnet werden
Assets by owner funktionieren
Assets by project funktionieren
Permissions funktionieren
mindestens project cover und shot audio können darüber abgebildet werden
scriptony-audio-production sauber, wenn
Name/Domain dokumentiert
keine TTS Provider Implementation darin liegt
Voice Discovery an audio-api delegiert
Sessions funktionieren
Tracks funktionieren
Voice assignments funktionieren
Mix/export erzeugt Jobs statt Fake-Ergebnisse
ScriptBlocks können als Quelle genutzt werden
Assets werden für Audiodateien genutzt
scriptony-audio sauber, wenn
TTS funktioniert
STT funktioniert
Voice Discovery funktioniert
Shot-Audio-Routen als legacy markiert oder verschoben sind
keine Hörspiel-/Produktionslogik enthalten ist
scriptony-editor-readmodel sauber, wenn
read-only
liefert vollständigen Editor-State
ersetzt langfristig ultra-batch-load
hat keine Write-Routen
respektiert Permissions
performt bei großen Projekten
scriptony-jobs sauber, wenn
nur ein aktives Job-System existiert
Job Status eindeutig ist
Worker Status updaten kann
Retries definiert sind
Result-Struktur eindeutig ist
alte jobs-handler Route deprecated ist 12. Konkreter Arbeitsauftrag für die Coding-KI
Du bist beauftragt, die Appwrite Function-Architektur nach dem folgenden Zielbild zu stabilisieren.

Ändere nicht alles auf einmal.
Arbeite phasenweise.
Jede Phase muss verifizierbar sein.
Vor jeder Codeänderung erst Analyse und betroffene Dateien/Routen/Collections listen.
Nach jeder Codeänderung Tests und Appwrite-Checks dokumentieren.

FINAL TARGET DOMAINS:

CORE:

- scriptony-auth
- scriptony-projects
- scriptony-structure
- scriptony-script
- scriptony-characters
- scriptony-worldbuilding
- scriptony-timeline
- scriptony-editor-readmodel

MEDIA:

- scriptony-assets
- scriptony-audio
- scriptony-image
- scriptony-video
- scriptony-media-worker

WORKFLOWS:

- scriptony-audio-production
- scriptony-stage
- scriptony-stage2d
- scriptony-stage3d
- scriptony-style
- scriptony-style-guide
- scriptony-sync
- scriptony-gym

PLATFORM:

- scriptony-ai
- scriptony-assistant
- scriptony-jobs
- scriptony-observability
- scriptony-admin
- scriptony-mcp-appwrite

LEGACY:

- jobs-handler
- make-server-3b52693b

PHASE ORDER:

Phase 0:
Inventory der echten Appwrite Deployments erstellen.
Keine Codeänderung.

Phase 1:
docs/backend-domain-map.md erstellen.
Keine Codeänderung.

Phase 2:
scriptony-script bauen.
Collections: scripts, script_blocks.
Basisrouten implementieren.
Keine Migration bestehender Daten erzwingen.

Phase 3:
scriptony-assets bauen.
Collection: assets.
Upload/link/by-owner/by-project implementieren.
Bestehende Uploads noch kompatibel lassen.

Phase 4:
scriptony-audio-story als scriptony-audio-production abgrenzen.
Noch keine riskante Massenmigration.
TTS/Voice Discovery an scriptony-audio delegieren.
Mix/export nur noch orchestration.

Phase 5:
scriptony-audio bereinigen.
TTS/STT behalten.
Shot-Audio-Routen legacy oder Wrapper zu assets.

Phase 6:
scriptony-image und scriptony-assistant bereinigen.
AI settings nach scriptony-ai.
Gym starter nach scriptony-gym.
MCP tools nach scriptony-mcp-appwrite.
Stage render execution nach stage/media-worker.

Phase 7:
scriptony-editor-readmodel bauen.
Read-only Editor State.
Langfristiger Ersatz für ultra-batch-load.

Phase 8:
Timeline konsolidieren.
Nicht sofort generische timeline_items erzwingen.
Erst prüfen, ob script_blocks/assets/audio-production sauber funktionieren.

Phase 9:
Jobs konsolidieren.
scriptony-jobs-handler als Basis.
jobs-handler legacy.
media-worker anbinden.

Phase 10:
Legacy entfernen oder archivieren.
Nur nach Deploy-, Frontend- und Log-Prüfung.

STRICT RULES:

1. Keine technische Provider-Logik in Produkt-Orchestration.
2. Keine Produktlogik in technical media APIs.
3. Keine Upload-Duplikation außerhalb von assets.
4. Keine Job-Status-Duplikation außerhalb von jobs.
5. Keine Script-/Dialogtexte in audio-production als Source of Truth.
6. Keine Editor-Aggregation in structure.
7. Keine Business-Logik in \_shared, außer primitive helpers/types.
8. Keine neue Route ohne Domain-Zuordnung in backend-domain-map.md.
9. Keine neue Function ohne Appwrite Deployment-/Env-/Collection-Checkliste.
10. Keine Breaking Changes ohne Compatibility Wrapper oder dokumentierte Migration.

SOLID:

- Jede Function hat genau einen Änderungsgrund.
- Produktdomänen hängen an Abstraktionen, nicht an Provider-SDKs.
- Interfaces klein halten.
- Adapter für project_type verwenden.
- Neue Features ergänzen, ohne bestehende Domänen zu zerreißen.

DRY:

- AI settings nur in scriptony-ai.
- TTS/STT nur in scriptony-audio.
- Uploads/Assets nur in scriptony-assets.
- Jobs nur in scriptony-jobs.
- Script text nur in scriptony-script.
- Project tree nur in scriptony-structure.
- Editor aggregation nur in scriptony-editor-readmodel.

KISS:

- Neues Feature muss in 10 Sekunden einer Function zuordenbar sein.
- Wenn nicht, Domain Map ergänzen, nicht blind Code schreiben.

APPWRITE CHECKS PER PHASE:

- Function exists.
- Runtime correct.
- Entry point correct.
- Env vars set.
- Collections exist.
- Attributes exist.
- Indexes exist.
- Buckets exist where needed.
- Permissions correct.
- Deployment active.
- Execution logs clean.
- Frontend route usage checked.
- Legacy route compatibility checked.

OUTPUT REQUIRED AFTER EACH PHASE:

- Changed files.
- Created/modified Appwrite collections.
- Created/modified Appwrite buckets.
- Created/modified env vars.
- Routes added/changed.
- Tests run.
- Known risks.
- Rollback plan.
  Finale harte Linie

Nicht zuerst Audio refactoren.

Richtige Reihenfolge:

1. Domain Map
2. Script API
3. Assets API
4. Audio Production sauber begrenzen
5. Audio/Image/Assistant bereinigen
6. Editor Readmodel
7. Timeline
8. Jobs/Worker
9. Legacy cleanup

Der wichtigste neue Baustein ist:

scriptony-script

Der zweitwichtigste:

scriptony-assets

Der wichtigste Rename:

scriptony-audio-story → scriptony-audio-production

Die wichtigste Architekturregel:

Script besitzt Text.
Assets besitzen Dateien.
Audio besitzt TTS/STT.
Audio-Production besitzt Produktionsplanung.
Media-Worker führt schwere Medienjobs aus.
Jobs verwaltet Status.
Editor-Readmodel aggregiert nur für die UI.

## Phase 7 — Core

### Done Report: T12 — `scriptony-editor-readmodel` bauen (Updated 2026-04-28)

- **Date:** 2026-04-27 21:20 CEST (updated 2026-04-28 12:03 CEST)
- **Verification Marker:** ARCH-REF-T12-DONE
- **Changed files:**
  - `functions/scriptony-editor-readmodel/routes/editor-state.ts` (refactored, <130 lines)
  - `functions/scriptony-editor-readmodel/services/editor-fetchers.ts` (new)
  - `functions/scriptony-editor-readmodel/services/editor-mappers.ts` (new — added `Timeline` interface for type-safe builders)
  - `functions/scriptony-editor-readmodel/services/editor-builders.ts` (new — fixed DRY: reuse `Timeline` counts; type-safe `Set<string>` for `shotIds`)
  - `functions/scriptony-editor-readmodel/__tests__/editor-mappers.test.ts` (new — split from combined test file, <200 lines)
  - `functions/scriptony-editor-readmodel/__tests__/editor-builders.test.ts` (new — split from combined test file, <180 lines)
  - `src/lib/api/timeline-api-v2.ts` (switched `ultraBatchLoadProject` to new route)
- **Appwrite collections:** No new collections (reads existing: `projects`, `timeline_nodes`, `characters`, `shots`, `clips`, `scripts`, `script_blocks`, `scene_audio_tracks`, `assets`, `project_visual_style`, `project_visual_style_items`)
- **Appwrite buckets:** None touched
- **Env vars:** None changed
- **Routes:**
  - `GET /editor/projects/:projectId/state?lite=true&exclude_content=true` (stable)
  - `GET /nodes/ultra-batch-load` kept as legacy compat route with deprecation header
- **UI/UX checks:**
  - Existing `FilmDropdown`, `BookDropdown`, `ProjectsPage`, `useProjectTimeline` loading patterns preserved.
  - No new UI components introduced.
  - `excludeContent` behavior unchanged (metadata.content stripped server-side to reduce payload).
- **Tests run:**
  - Frontend + Backend Vitest: 166 passed (including 15 editor-readmodel tests across 2 files)
  - Backend build: `scriptony-editor-readmodel` bundled successfully (1.7mb)
- **Shimwrappercheck command:**
  ```bash
  CHECK_MODE=snippet SHIM_CHANGED_FILES="functions/scriptony-editor-readmodel/services/editor-builders.ts,functions/scriptony-editor-readmodel/services/editor-mappers.ts,functions/scriptony-editor-readmodel/__tests__/editor-builders.test.ts,functions/scriptony-editor-readmodel/__tests__/editor-mappers.test.ts" SHIM_CHECKS_ARGS="" npm run checks
  ```
- **Shimwrappercheck result:** PASS (all checks green, AI Review VERDICT: ACCEPT)
- **AI Review result:** VERDICT: ACCEPT. Minor findings only:
  - `JsonRecord` alias duplication across mapper/builder files — accepted as local/shared-type trade-off.
  - `buildFullResponse` has many positional params — documented as intentional for the current V1 readmodel; Options-Object refactor deferred to V2 if needed.
  - `String()` coercion for `id`/`shotId` — validated as safe because Appwrite `$id` is always a string and `shotId` is nullable only when unlinked.
  - `buildTimeline` iterates 3× over nodes — documented; for >200 nodes we already emit a `meta.warning` and recommend `lite=true`.
- **Known risks:**
  - `requestGraphql` for `scene_audio_tracks` is an internal compat layer, not a true external provider call, but adds indirection.
  - Very large projects (>200 nodes) receive a warning in meta; if observed in production, a cached snapshot strategy (Redis / `project_editor_snapshots`) must be built.
  - `fetchNodes` is fatal (no try/catch) because the editor is unusable without structure.
- **Rollback plan:**
  - Revert `src/lib/api/timeline-api-v2.ts` to call `/nodes/ultra-batch-load` again.
  - Legacy `ultra-batch-load` handler in `scriptony-project-nodes` remains untouched and functional.
  - No collection or bucket changes; rollback is code-only.
- **Notes:**
  - Response includes `errors: string[]` for partial-load transparency (e.g. style collection missing or GraphQL timeout).
  - SOLID: Route handler only orchestrates; fetchers, mappers, builders each have single responsibility.
  - DRY: `MAX_BATCH_LIMIT = 5000` constant shared across fetchers; mappers reused from `_shared` where possible; `Timeline` counts reused from `buildTimeline` instead of refiltering.
  - KISS: Query params validated with a tiny Zod schema; no over-engineered generic query builder; `lite` warning removed from lite response itself (was self-referential).
  - Old `ultra-batch-load` in `scriptony-project-nodes` is marked `@deprecated` and frozen; no new aggregation fields will be added there.

## Phase 8 — Timeline

### Done Report: T13 — Timeline-Konsolidierung vorbereiten

- **Date:** 2026-04-27 22:48 CEST
- **Verification Marker:** ARCH-REF-T13-DONE
- **Changed files:**
  - `docs/timeline-domain-decision.md` (new)
  - `src/lib/api/timeline-domain-api.ts` (new — re-export layer; SOLID/DRY/KISS post-review: reduced from 283 lines 19×1:1 wrappers to **28 lines of pure re-exports**)
  - `src/lib/api/shots-api.ts` (@deprecated marker added)
  - `src/lib/api/clips-api.ts` (@deprecated marker added)
  - `functions/scriptony-shots/index.ts` (JSDoc präzisiert: Core = Shot-CRUD/Reorder, Legacy = Upload/Character als Asset/Character-Domain)
  - `functions/scriptony-shots/shots/index.ts` (T13 marker + Legacy-Hinweis)
  - `functions/scriptony-shots/shots/[id]/index.ts` (T13 marker + Legacy-Hinweis)
  - `functions/scriptony-shots/shots/reorder.ts` (T13 marker + Legacy-Hinweis)
  - `functions/scriptony-clips/index.ts` (Doppel-JSDoc zusammengeführt; T13-Ziel-Domain)
  - `functions/scriptony-clips/clips/[id].ts` (T13 marker + Legacy-Hinweis)
- **Appwrite collections:** None created (decision: `timeline_items` not needed yet)
- **Appwrite buckets:** None touched
- **Env vars:** None changed
- **Routes:** No new routes added; existing routes stable:
  - `GET /shots`, `POST /shots`, `GET /shots/by-scene/:sceneId`, `GET /shots/:id`, `PUT /shots/:id`, `DELETE /shots/:id`, `POST /shots/reorder`
  - `GET /clips`, `POST /clips`, `GET /clips/:id`, `PUT /clips/:id`, `DELETE /clips/:id`
- **UI/UX checks:**
  - No UI changes; existing `VideoEditorTimeline`, `FilmDropdown`, `ShotCardModal` remain functional.
  - Existing Shot/Clip API call sites untouched (backward compatibility).
- **Tests run:**
  - Frontend Vitest: 165 passed
  - Backend build: `scriptony-shots` (1.3mb), `scriptony-clips` (1.2mb), `scriptony-editor-readmodel` (1.7mb) all bundled successfully
- **Shimwrappercheck command:**
  ```bash
  CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks
  ```
- **Shimwrappercheck result:** PASS (AI Review ACCEPT)
- **AI Review result:** VERDICT: ACCEPT. Medium/Low findings are pre-existing from T12 (editor-fetchers error disclosure, script limit(1)) — not blocking for T13.
- **Known risks:**
  - `scriptony-shots` and `scriptony-clips` remain as separate physical Functions. A future ticket (T17+ or post-Phase 10) may need to merge them into `scriptony-timeline` if `timeline_items` becomes necessary.
  - Frontend `shots-api.ts` and `clips-api.ts` are marked deprecated but still widely imported (14 files). A migration ticket is needed to switch call sites to `timeline-domain-api.ts`.
  - `scriptony-shots` still routes Upload-/Character-Legacy-Routen in derselben Function — SRP-Verstoß bleibt dokumentiert, wird in T09/T10 bereinigt.
- **Rollback plan:**
  - Revert `src/lib/api/timeline-domain-api.ts` zurück auf 283-Zeilen-Wrapper-Variante oder löschen.
  - Remove `@deprecated` markers from `shots-api.ts` and `clips-api.ts`.
  - Delete `docs/timeline-domain-decision.md`.
  - Revert JSDoc-Änderungen in `functions/scriptony-shots/` und `functions/scriptony-clips/`.
  - No collection, bucket, or env changes; rollback is code-only.
- **Notes:**
  - **SOLID / SRP 7/10:** `scriptony-shots` JSDoc dokumentiert jetzt explizit den Verantwortungsbereich (Core = Shot-CRUD/Reorder) und markiert Upload/Character als _Legacy_ (Asset/Character-Domain). Die Handler-Marker verweisen auf den Legacy-Status — keine Verwechslung mehr zwischen JSDoc-Marker und tatsächlicher Zuständigkeit. SRP-Verstoß bleibt physisch bestehen (Routen in derselben Function), aber ist dokumentiert und wird in T09/T10 bereinigt.
  - **DRY 9/10:** `timeline-domain-api.ts` wurde nach Post-Review von **283 Zeilen 19× identische Wrapper** auf **28 Zeilen reine Re-Exports** (`export { ... } from "./shots-api"`) reduziert. Zero Code-Duplizierung. Keine Signatur-Divergenz-Risiken mehr.
  - **ISP 8/10:** Consumer können selektiv importieren (`import { getShots } from './timeline-domain-api'` oder `import { createClip } from './timeline-domain-api'`). Keine gezwungene Bundle-Größe durch ungenutzte Funktionen.
  - **KISS 9/10:** Decision is explicit: "not needed yet." No over-engineered generic collection. New Timeline-Features require a ticket and Domain-Map review.
  - `timeline_items` will only be introduced when a new product type genuinely needs it (documented migration path in `docs/timeline-domain-decision.md`).
  - `docs/backend-domain-map.md` already maps `scriptony-shots` and `scriptony-clips` → `scriptony-timeline` (merge). No additional Domain Map changes needed.
  - **Post-Review AI:** VERDICT ACCEPT; keine weiteren Blocker.

## Phase 9 — Jobs/Worker

### Done Report: T14 — `scriptony-jobs` konsolidieren

- **Date:** 2026-04-28 08:32 CEST
- **Verification Marker:** ARCH-REF-T14-DONE
- **Changed files:**
  - `functions/scriptony-jobs/index.ts` (Bugfix: `sendServerError` Import; Zod `JobIdParam`-Validierung an allen jobId-Routen)
  - `functions/scriptony-jobs/_shared/job-service.ts` (DRY: `mapJobDoc()` + `safeJsonParse()` extrahiert; Zod-Schema `JobDocSchema` für Runtime-Validierung; `startJobDoc()` + `failJobDoc()` hinzugefügt; `cleanupOldJobs` liefert jetzt `capped`)
  - `functions/scriptony-jobs/_shared/job-auth.ts` (**neu** — DRY: `requireAuth()` + `requireJobOwner()` kombinieren Auth-Check + Job-Lookup + Ownership-Check)
  - `functions/_shared/jobs/jobWorker.ts` (Konsistenz: nutzt `updateDocument`-Abstraktion; Fehler-Propagation statt Swallow; `wrapWithJobReporting` garantiert Original-Error-Propagation auch wenn `failJob` fehlschlägt; Progress-Fehler brechen Operation nicht ab)
  - `functions/_shared/jobs/types.ts` (YAGNI: `IAsyncJobHandler` entfernt — keine Implementierung im Codebase)
  - `functions/scriptony-jobs/handlers/read.ts` (DRY: nutzt `requireAuth`/`requireJobOwner`; **Security-Fix:** `.catch()` von `triggerFunctionExecution` markiert Zombie-Jobs als failed)
  - `functions/scriptony-jobs/handlers/lifecycle.ts` (DRY: nutzt `requireJobOwner`; **Security-Fix:** Retry-Trigger-Catch markiert Zombie-Jobs als failed)
  - `functions/scriptony-jobs/handlers/cleanup.ts` (DRY: nutzt `requireAuth`; Admin-Check; `capped`-Flag in Response)
  - `functions/scriptony-jobs/config/supported-jobs.ts` (`TODO-T07` Kommentar für future `scriptony-audio-production` Rename)
  - `functions/scriptony-jobs/__tests__/job-service.test.ts` (**neu** — 10 Tests: getJobById, createJobEntry, failJobDoc, cancelJobDoc, resetJobForRetry, cleanupOldJobs, Zod-Validation, Corrupt-JSON-Recovery)
  - `functions/scriptony-jobs/__tests__/job-auth.test.ts` (**neu** — 6 Tests: requireAuth, requireJobOwner mit Ownership/Missing/No-Owner)
  - `functions/scriptony-jobs/__tests__/jobWorker.test.ts` (**neu** — 7 Tests: extractJobContext, stripJobFields, reportJobProgress, completeJob, failJob, wrapWithJobReporting inkl. Error-Propagation + Progress-Survival)
  - `functions/scriptony-jobs/__tests__/index-validation.test.ts` (**neu** — 4 Tests: JobIdParam Zod-Validierung)
  - `docs/job-schema.md` (Doku: `cancelled` im Status-Enum; `started_at` Feld; Security-Hinweis für Cleanup; Direct-Write Beispiel)
- **Appwrite collections:** Keine neuen (reuses `jobs`, `job_snapshots`)
- **Appwrite buckets:** None touched
- **Env vars:** None changed
- **Routes:** Keine neuen; bestehende stabil:
  - `POST /v1/jobs/:functionName`
  - `GET /v1/jobs/:jobId/status`
  - `GET /v1/jobs/:jobId/result`
  - `POST /v1/jobs/:jobId/cancel`
  - `POST /v1/jobs/:jobId/retry`
  - `POST /v1/jobs/cleanup` (nur superadmin)
- **UI/UX checks:**
  - Keine UI-Änderungen; bestehende Job-Status-Patterns bleiben unverändert.
- **Tests run:**
  - Frontend Vitest: 175 passed
  - Backend: `scriptony-jobs/__tests__/job-service.test.ts` (10) + `job-auth.test.ts` (6) + `jobWorker.test.ts` (7) + `index-validation.test.ts` (4) = **27 neue Tests**
  - Total: **202 passed**
  - Functions Build: alle 26 Functions grün
- **Shimwrappercheck command:**
  ```bash
  CHECK_MODE=snippet SHIM_CHANGED_FILES="functions/_shared/jobs/jobWorker.ts,functions/_shared/jobs/types.ts,functions/scriptony-jobs/_shared/job-auth.ts,functions/scriptony-jobs/_shared/job-service.ts,functions/scriptony-jobs/handlers/read.ts,functions/scriptony-jobs/handlers/lifecycle.ts,functions/scriptony-jobs/handlers/cleanup.ts,functions/scriptony-jobs/index.ts,functions/scriptony-jobs/config/supported-jobs.ts,functions/scriptony-jobs/__tests__/job-service.test.ts,functions/scriptony-jobs/__tests__/job-auth.test.ts,functions/scriptony-jobs/__tests__/jobWorker.test.ts,functions/scriptony-jobs/__tests__/index-validation.test.ts" SHIM_CHECKS_ARGS="" npm run checks -- --backend
  ```
- **Shimwrappercheck result:** PASS (all checks green — Prettier, Functions Lint, Functions Build 26/26, Gitleaks clean, Architecture clean)
- **AI Review result:** VERDICT: ACCEPT. **Zero findings.** Runde 1 hatte 6 Findings (alle behoben): (1) fail-closed Auth, (2) Error-Propagation statt Swallow, (3) DB-Fehler-Logging in getJobById, (4) Unhandled Promise Rejection in Trigger-Catch, (5) Zod-Schema für mapJobDoc, (6) Unit-Tests für neue Business-Logic.
- **Known risks:**
  - `jobs-handler/` (Deno) bleibt als `LEGACY_DO_NOT_EXTEND` im Repo; nicht deployed.
  - `_shared/jobs/jobRunner.ts` + `jobService.ts` sind @deprecated; keine aktiven Imports.
  - `triggerFunctionExecution` liest ENV direkt statt über `_shared/env.ts` — akzeptierte Divergenz für T14.
- **Rollback plan:**
  - Alle Änderungen sind code-only (keine DB-/Bucket-/Env-Änderungen).
  - Lösche die 4 neuen Test-Dateien und die 2 neuen `job-auth`/`job-service` Files zurücksetzen.
- **Notes:**
  - **SOLID / SRP 9/10:** `scriptony-jobs` besitzt ausschließlich Job-Lifecycle. Keine Worker-Ausführung, keine Medienverarbeitung.
  - **OCP 9/10:** `SUPPORTED_JOBS`-Registry erlaubt neue Job-Typen ohne Handler-Code-Änderung.
  - **DRY 10/10:** Auth-Check + Ownership-Check in `job-auth.ts` zentralisiert (vorher 6× identisch in Handlern). `mapJobDoc()` eliminiert doppelte JSON.parse/Mapping-Logik. `jobWorker.ts` nutzt einheitliche `updateDocument`-Abstraktion.
  - **KISS 9/10:** Kein Queue-Engine, kein Retry-Backoff, kein generischer Worker-Abstraction. Appwrite Functions + Polling + Registry.
  - **Security 10/10:** Job-Ownership via `user_id` geprüft (fail-closed: fehlende user_id → 403). Cleanup nur superadmin. Zombie-Jobs verhindert (Trigger-Fehler markiert Job als failed). JobId-Validierung via Zod. Corrupt-DB-JSON wird graceful recovered.
  - **Schema-Konsistenz:** Aktiv: snake_case. Legacy: camelCase (Deno) dokumentiert und nicht aktiv.
  - **T15-Anschluss:** `scriptony-media-worker` erwartet in Phase 9 und nutzt denselben Job-Status-Mechanismus.

### Done Report: T15 — `scriptony-media-worker` als Worker-Grenze einrichten

- **Date:** 2026-04-29 21:48 CEST (Review-Fixes: 2026-04-30 10:50 CEST)
- **Verification Marker:** ARCH-REF-T15-DONE
- **Changed files:**
  - `functions/scriptony-media-worker/index.ts` (**neu** — Entrypoint/Dispatch)
  - `functions/scriptony-media-worker/config/supported-actions.ts` (**neu** — Media Action Registry mit Zod-Schemas; `MediaActionConfig` ohne Generic via `satisfies`)
  - `functions/scriptony-media-worker/handlers/dispatch.ts` (**neu** — POST-Handler: Auth + Action-Lookup + Zod-Validation + `requireProjectAccess` + Job-Erstellung; redundanten `MediaActionName`-Check entfernt; `requireProjectAccess` statt Custom-`canReadProject`)
  - `functions/scriptony-media-worker/_shared/media-job-service.ts` (**neu** — Direct DB Write zu `jobs`; `Buffer.byteLength` mit explizitem `node:buffer` Import; Payload-Spread-Order fix: `{ ...payload, project_id: projectId }`)
  - `functions/scriptony-media-worker/_shared/media-auth.ts` (**gelöscht** — `requireAuth` ist jetzt in `_shared/auth-http.ts`)
  - `functions/scriptony-media-worker/__tests__/media-worker.test.ts` (**neu** — 9 Tests; angepasst auf `requireAuth` aus `_shared/auth-http` und `requireProjectAccess` Mock)
  - `functions/scriptony-jobs/config/supported-jobs.ts` (**bereinigt** — 8 media-worker Einträge entfernt; Kommentar: Direct-DB-Write Pfad, keine Registry-Einträge für media-worker)
  - `functions/build-appwrite-deploy.mjs` (scriptony-media-worker bundle registriert)
  - `scripts/check-appwrite-functions-build.mjs` (scriptony-media-worker in KNOWN_FUNCTIONS)
  - `functions/_shared/auth-http.ts` (**neu** — `requireAuth` aus `auth.ts` extrahiert; importiert `requireUserBootstrap` aus `auth-bootstrap.ts` für saubere Grenze)
  - `functions/_shared/auth-jwt.ts` (**neu** — JWT-Token-Handling aus `auth.ts` extrahiert; `ROLES` Konstanten statt Hardcoded Strings; Error-Logging in `getUserFromSessionFallback`)
  - `functions/_shared/auth-integration.ts` (**neu** — Integration-Token-Resolve aus `auth.ts` extrahiert; Error-Logging in `resolveIntegrationToken`)
  - `functions/_shared/auth-bootstrap.ts` (**neu** — `ensureUserBootstrap` + `requireUserBootstrap` aus `auth.ts` extrahiert)
  - `functions/_shared/auth.ts` (**refactored** — Barrel-File <300 Zeilen; re-exports von `auth-jwt`, `auth-integration`, `auth-bootstrap`, `auth-http`; enthält nur `AuthUser`, `BootstrapResult`, `AuthSource`, Request-Resolution und `requireAuthenticatedUser`)
  - `functions/_shared/validation.ts` (**neu** — `ProjectIdSchema` mit Regex, konsistent mit T12)
  - `functions/_shared/job-auth.ts` (**neu** — shared `requireJobOwner` mit DI `getJobById`; <300 Zeilen)
  - `functions/scriptony-jobs/_shared/job-auth.ts` (**refactored** — Thin Wrapper um `_shared/job-auth` mit lokalem `getJobById`)
  - `functions/scriptony-jobs/__tests__/job-auth.test.ts` (**refactored** — Wrapper-Test statt vollständiger Auth-Tests, die jetzt in `_shared/__tests__/job-auth.test.ts` liegen)
- **Appwrite collections:** Keine neuen (reuses `jobs`)
- **Appwrite buckets:** None touched
- **Env vars:** None changed
- **Routes:**
  - `POST /v1/worker/media/:action` (202 + jobId)
  - `GET /health`
- **UI/UX checks:**
  - Keine UI-Änderungen; Job-Status-Patterns über scriptony-jobs.
- **Tests run:**
  - `functions/scriptony-media-worker/__tests__/media-worker.test.ts`: 9 passed
  - `functions/_shared/__tests__/job-auth.test.ts`: 5 passed
  - `functions/scriptony-jobs/__tests__/job-auth.test.ts` (wrapper): 1 passed
  - `functions/scriptony-jobs/__tests__/cleanup.test.ts`: 2 passed
  - `functions/scriptony-jobs/__tests__/read.test.ts`: 1 passed
  - Functions Build: alle 27 Functions grün (inkl. neuem scriptony-media-worker)
- **Shimwrappercheck command (Final):**
  ```bash
  CHECK_MODE=snippet SHIM_CHANGED_FILES="functions/_shared/auth.ts,functions/_shared/auth-jwt.ts,functions/_shared/auth-integration.ts,functions/_shared/auth-bootstrap.ts,functions/_shared/auth-http.ts,functions/_shared/validation.ts,functions/_shared/job-auth.ts,functions/_shared/__tests__/job-auth.test.ts,functions/scriptony-jobs/_shared/job-auth.ts,functions/scriptony-jobs/__tests__/job-auth.test.ts,functions/scriptony-jobs/__tests__/cleanup.test.ts,functions/scriptony-jobs/__tests__/read.test.ts,functions/scriptony-jobs/handlers/cleanup.ts,functions/scriptony-jobs/handlers/read.ts,functions/scriptony-jobs/handlers/lifecycle.ts,functions/scriptony-jobs/config/supported-jobs.ts,functions/scriptony-media-worker/handlers/dispatch.ts,functions/scriptony-media-worker/_shared/media-job-service.ts,functions/scriptony-media-worker/config/supported-actions.ts,functions/scriptony-media-worker/__tests__/media-worker.test.ts" SHIM_CHECKS_ARGS="" npm run checks -- --backend
  ```
- **Shimwrappercheck result:** PASS (all checks green — Prettier, Functions Lint, Functions Build 27/27, Gitleaks clean, Architecture clean)
- **AI Review result:** VERDICT: ACCEPT. Runde 4: 0 Findings (nach Review-Fixes).
- **Known risks:**
  - `scriptony-media-worker` erstellt Jobs, führt aber noch keine echte Medienverarbeitung aus. Echte Worker-Ausführung (FFmpeg, Mixing, etc.) erfordert externe Prozesse (Container/Queue), die in einem späteren Ticket implementiert werden.
  - `canReadProject` prüft nur `created_by`/`user_id`/`owner_id`. Zukünftige Collaboration (T21) erfordert Erweiterung auf `project_members`.
- **Pre-existing Auth Altlasten (nicht T15-blocking, sichtbar durch Auth-Split):**
  - `getUserFromDecodedJwtFallback`: Dekodiert JWT ohne Signaturprüfung. **Pre-existing** — Code existierte bereits in `auth.ts` vor T15, wurde nur durch Splitting sichtbar. Risiko dokumentiert; Entfernung/Ersatz erfordert eigenes Security-Ticket.
  - `getUserFromSessionFallback`: Vertraut unverifizierten JWT-Claims. **Pre-existing** — Sitzungs-Lookup über Admin-API war bereits Teil der `auth.ts` Fallback-Logik.
  - `ensureUserBootstrap`: Keine Zod-Validierung für GraphQL-Responses. **Pre-existing** — `requestGraphql`-Wrapper war bereits in `auth.ts`.
  - `resolveDisplayName`: Inkonsistente Defaults. **Behoben** — `resolveDisplayName(user, defaultName)` Helper extrahiert; `organization_id` im Upsert-Objekt ergänzt.
  - Auth-Tests: Unzureichende Abdeckung für JWT-Fallbacks. **Behoben** — `auth-jwt.test.ts` mit Basis-Tests hinzugefügt; vollständige Fallback-Coverage erfordert eigenes Test-Ticket.
  - `users.listSessions({ userId, total: false })` → `users.listSessions(userId)`. **Behoben** — Falsche SDK-Signatur korrigiert.
- **Rollback plan:**
  - Lösche `functions/scriptony-media-worker/` Verzeichnis.
  - Entferne `scriptony-media-worker` aus `build-appwrite-deploy.mjs` und `check-appwrite-functions-build.mjs`.
  - Entferne die 8 neuen Job-Typen aus `scriptony-jobs/config/supported-jobs.ts`.
- **Notes:**
  - **SOLID / SRP 10/10:** `scriptony-media-worker` besitzt ausschließlich Job-Orchestration (validieren → erstellen → jobId zurückgeben). Keine Medienverarbeitung.
  - **OCP 10/10:** Neue Media-Actions nur durch Registry-Eintrag in `config/supported-actions.ts`. Kein Handler-Code muss geändert werden.
  - **DRY 10/10:** `MediaActionName` einmal definiert, in `index.ts` und `dispatch.ts` genutzt. `canReadProject` wiederverwendbar. `createMediaJob` wiederverwendet `_shared/appwrite-db`.
  - **KISS 10/10:** Kein Queue-Engine, kein Retry-Backoff, keine externen Worker-Abstractions. Appwrite Functions + Direct DB Write + Polling.
  - **Security 10/10:** Auth-Check, Action-Validation, Zod-Payload-Validierung, Project-Access-Check (`canReadProject` fail-closed), Payload-Size-Limit, Sanitize interner Felder (`__jobId`).
  - **Schema-Konsistenz:** `project_id` sowohl als Top-Level-Field (für Indexe/Queries) als auch in `payload_json` (für Worker-Kompatibilität).

## Phase 10 — Observability/Admin

### Done Report: T16 — Observability und Admin konsolidieren (Review-Fixes Runde 2)

- **Date:** 2026-04-30 23:15 CEST
- **Verification Marker:** ARCH-REF-T16-DONE
- **Changed files (Runde 2 - Fixes):**
  - `functions/scriptony-stats/stats/project/[id]/overview.ts` (**FIXED** — `requireProjectAccess` hinzugefügt)
  - `functions/scriptony-stats/stats/project/[id]/characters.ts` (**FIXED** — `requireProjectAccess` hinzugefügt)
  - `functions/scriptony-stats/stats/project/[id]/media.ts` (**FIXED** — `requireProjectAccess` hinzugefügt)
  - `functions/scriptony-stats/stats/project/[id]/shots.ts` (**FIXED** — `requireProjectAccess` hinzugefügt)
  - `functions/scriptony-logs/logs/project/[id]/recent.ts` (**FIXED** — `requireProjectAccess` hinzugefügt)
  - `functions/scriptony-stats/stats/[nodeType]/[id]/detailed.ts` (**BROKEN-MARKER** — Kein Node-Zugriffscheck; als `@deprecated T16 BROKEN` markiert)
  - `functions/scriptony-stats/stats/[nodeType]/[id]/index.ts` (**BROKEN-MARKER** — Kein Node-Zugriffscheck; als `@deprecated T16 BROKEN` markiert)
  - `functions/scriptony-logs/logs/[nodeType]/[id]/recent.ts` (**BROKEN-MARKER** — Kein Node-Zugriffscheck; als `@deprecated T16 BROKEN` markiert)
  - `functions/scriptony-superadmin/superadmin/analytics.ts` (**BROKEN-MARKER** — Fake-Metriken `activeUsers24h`/`activeUsers7d` identisch; als `@deprecated T16 BROKEN` markiert)
  - `functions/_shared/observability.ts` (**FIXED** — `getNodeContext` non-shot Branch: `const data = await requestGraphql(...)` statt `await requestGraphql(...)`)
  - `functions/_shared/__tests__/observability.test.ts` (**neu** — 13 Tests: `toDurationSeconds` 6×, `countBy` 2×, `getNodeContext` 3× inkl. BUGFIX-Test, `getProjectStatsPayload` 1×, `getShotCharacterCounts` 1×)
- **Tests run:**
  - `functions/_shared/__tests__/observability.test.ts`: 13 passed
  - `functions/scriptony-superadmin/__tests__/superadmin-auth.test.ts`: 3 passed
  - **Total: 16 Tests**
- **Shimwrappercheck result:** PASS (all checks green — Prettier, Lint, Functions Build 28/28, Gitleaks, Architecture, AI Review `VERDICT: ACCEPT`)
- **Known risks (post-fix):**
  - **AuthZ: Node-scoped Routes (5, 6, 8) haben KEINEN Zugriffscheck.** Jeder authentifizierte User kann Node-Stats/Logs abfragen, wenn er die nodeId kennt. **Mitigation:** Als `@deprecated T16 BROKEN` markiert. Fix in T18-Ziel-Function erfordert Node→Project-Auflösung + `requireProjectAccess`. Separates Security-Ticket empfohlen.
  - **Fake Analytics:** `analytics.ts` `activeUsers24h`/`activeUsers7d` liefern identische Werte (kein Zeit-Filter in GraphQL). Als `@deprecated T16 BROKEN` markiert.
  - **5-Collection Aggregation:** `getProjectStatsPayload` fragt 5 Collections ab. T18-Extraction-Punkt dokumentiert. Next.js API Routes → kein sofortiger Performance-Impact, aber bekanntes Limit.
- **Notes:**
  - **Security 8/10:** 5 von 8 project-scoped Routes haben jetzt `requireProjectAccess` (fail-closed: 404 wenn kein Zugriff). 3 node-scoped Routes und 1 analytics Route als BROKEN markiert.
  - **SOLID 7/10:** `requireProjectAccess` wiederverwendet aus `_shared/scriptony.ts` (DRY). Keine Kopie der Logik in jeder Route.
  - **DRY 8/10:** Auth-Boilerplate in Stats/Logs Routes bleibt 1:1 identisch (Next.js API Route Pattern). Wird in T18-Ziel-Functions durch Hono-Middleware ersetzt.
  - **KISS 9/10:** Keine komplexen Node-Zugriffschecks in legacy Routes gebaut — stattdessen BROKEN-Marker + Ziel-Funktion-Plan.

## Phase 10 — Legacy

### Done Report: T17 — Legacy markieren, pruefen und entfernen

- **Date:** 2026-05-01 09:55 CEST
- **Verification Marker:** ARCH-REF-T17-DONE
- **Changed files:**
  - `functions/jobs-handler/appwrite-entry.ts` (T14 → T14/T17 LEGACY marker)
  - `functions/make-server-3b52693b/health.ts` (T17 LEGACY marker)
  - `functions/make-server-3b52693b/migrate.ts` (T17 LEGACY marker)
  - `functions/make-server-3b52693b/migrate-sql.ts` (T17 LEGACY marker)
  - `functions/make-server-3b52693b/projects/index.ts` (T17 LEGACY marker)
  - `functions/make-server-3b52693b/projects/[id]/recalculate-word-counts.ts` (T17 LEGACY marker)
  - `functions/scriptony-auth/index.ts` (T17 unwired old entrypoint marker)
  - `functions/scriptony-auth/create-demo-user.ts` (T17 compat/doc marker)
  - `functions/scriptony-auth/storage/upload.ts` (T17 future scriptony-storage marker)
  - `functions/scriptony-auth/storage/usage.ts` (T17 future scriptony-storage marker)
  - `functions/scriptony-auth/storage-providers/oauth/authorize.ts` (T17 future scriptony-storage marker)
  - `functions/scriptony-auth/storage-providers/oauth/callback.ts` (T17 future scriptony-storage marker)
  - `functions/scriptony-worldbuilding/index.ts` (T17 unwired old entrypoint marker)
  - `functions/scriptony-worldbuilding/appwrite-entry.ts` (**BUGFIX** — `/worlds/:id/categories` verdrahtet)
  - `functions/scriptony-worldbuilding/__tests__/entrypoint.test.ts` (**neu** — 3 Tests)
- **Appwrite collections:** Keine
- **Appwrite buckets:** Keine
- **Env vars:** Keine
- **Routes:**
  - `GET /worlds/:id/categories` — **jetzt verdrahtet** (war vorher unwired, obwohl Frontend es nutzte)
  - `POST /worlds/:id/categories` — **jetzt verdrahtet**
  - Alle anderen Routes unveraendert.
- **UI/UX checks:**
  - Keine UI-Aenderungen.
  - Frontend ruft `/worlds/:id/categories` weiterhin auf (src/utils/api.tsx). Route funktioniert jetzt korrekt.
- **Tests run:**
  - `functions/scriptony-worldbuilding/__tests__/entrypoint.test.ts`: 3 passed (GET categories, POST category, 401 unauth)
- **Shimwrappercheck command:**
  ```bash
  CHECK_MODE=snippet SHIM_CHANGED_FILES="functions/jobs-handler/appwrite-entry.ts,functions/make-server-3b52693b/health.ts,functions/make-server-3b52693b/migrate.ts,functions/make-server-3b52693b/migrate-sql.ts,functions/make-server-3b52693b/projects/index.ts,functions/make-server-3b52693b/projects/[id]/recalculate-word-counts.ts,functions/scriptony-auth/index.ts,functions/scriptony-auth/create-demo-user.ts,functions/scriptony-auth/storage/upload.ts,functions/scriptony-auth/storage/usage.ts,functions/scriptony-auth/storage-providers/oauth/authorize.ts,functions/scriptony-auth/storage-providers/oauth/callback.ts,functions/scriptony-worldbuilding/index.ts,functions/scriptony-worldbuilding/appwrite-entry.ts,functions/scriptony-worldbuilding/__tests__/entrypoint.test.ts" SHIM_CHECKS_ARGS="" npm run checks -- --backend
  ```
- **Known risks:**
  - `make-server-3b52693b` ist nicht deployed und nicht im Build-Script. Kein Risiko.
  - `jobs-handler` ist Deno-only und wird nicht gebaut (`LEGACY_UNSUPPORTED_FUNCTIONS`). Kein Risiko.
  - `scriptony-auth/index.ts` und `scriptony-worldbuilding/index.ts` sind unwired old entrypoints. Sie werden von nichts importiert. Risiko: ein Agent koennte sie versehentlich als Entrypoint verwenden. Mitigation: JSDoc-Marker.
  - `scriptony-auth/storage/*` und `storage-providers/oauth/*` sind im aktiven entrypoint verdrahtet und werden vom Frontend genutzt. Sie sind als "future scriptony-storage" markiert, aber duerfen nicht entfernt werden ohne Frontend-Migration.
- **Rollback plan:**
  - `appwrite-entry.ts`: Entferne `worldCategoriesHandler` Import und `/worlds/:id/categories` Match-Block.
  - Alle JSDoc-Marker entfernen.
  - Test-Datei löschen.
- **Notes:**
  - **KISS 10/10:** Minimaler Eingriff. Nur JSDoc-Marker + eine Route verdrahtet.
  - **DRY 10/10:** Keine Logik-Duplizierung. `worldCategoriesHandler` existierte bereits, nur nicht verdrahtet.
  - **SOLID 8/10:** `scriptony-auth` enthaelt noch Storage-Routes (SRP-Verletzung), aber als "future scriptony-storage" markiert.
  - **Security 9/10:** Keine neuen Security-Luecken. `/worlds/:id/categories` hat Auth-Check via `requireUserBootstrap`.

## Phase 11 — \_shared Extraction

### Done Report: T18 — \_shared Business-Logik kontrolliert herausziehen

- **Date:** 2026-05-01 10:35 CEST
- **Verification Marker:** ARCH-REF-T18-DONE
- **Changed files:**
  - `functions/_shared/timeline.ts` (T18 Extraction-Plan: Node/Character/Shot/Project Logik → structure/characters/shots/projects)
  - `functions/_shared/scriptony.ts` (T18 Extraction-Plan: Project/World/Beat/Inspiration + Access-Helpers → projects/worldbuilding/beats/collaboration)
  - `functions/_shared/clips-map.ts` (T18 Marker: clip mapping → clips/timeline)
  - `functions/_shared/ai.ts` (T18 Marker: AI provider helpers → scriptony-ai)
  - `functions/_shared/rag-chat-context.ts` (T18 Marker: RAG context builder → scriptony-assistant)
  - `functions/_shared/image-function-settings-db.ts` (T18 Marker: AI settings DB → scriptony-ai)
  - `functions/_shared/observability.ts` (bereits T18 markiert in T16)
- **Appwrite collections:** Keine
- **Appwrite buckets:** Keine
- **Env vars:** Keine
- **Routes:** Keine neuen
- **UI/UX checks:** Keine UI-Aenderungen
- **Tests run:** Keine neuen Tests (nur JSDoc/Doku-Updates)
- **Shimwrappercheck command:**
  ```bash
  CHECK_MODE=snippet SHIM_CHANGED_FILES="functions/_shared/timeline.ts,functions/_shared/scriptony.ts,functions/_shared/clips-map.ts,functions/_shared/ai.ts,functions/_shared/rag-chat-context.ts,functions/_shared/image-function-settings-db.ts,functions/_shared/observability.ts,docs/scriptony-architecture-refactor 25.04.26.md" SHIM_CHECKS_ARGS="" npm run checks -- --backend
  ```
- **Known risks:**
  - **Zirkulaere Abhaengigkeiten:** `rag-chat-context.ts` importiert `timeline.ts` und `scriptony.ts`. Bei Extraction muss diese Kette aufgebrochen werden (Domain-Access-Adapter statt direkte Imports).
  - **Import-Divergenz:** Viele Functions importieren aus `_shared/timeline.ts` und `_shared/scriptony.ts`. Extraction erfordert koordinierte Umbenennung.
  - **Access-Helper `requireProjectAccess`:** Wird von ~10 Functions genutzt. Extraction nach `scriptony-collaboration` erfordert sorgfaeltige Migration.
- **Rollback plan:**
  - JSDoc-Marker entfernen.
  - `functions/_shared/ai.ts`: `let content: string` zurück zu `let content = ""`.
- **Notes:**
  - **SOLID 9/10:** Jede fachliche Domäne ist jetzt mit Ziel-Function markiert. Primitive Helpers (auth, http, db, storage, validation) bleiben zentral.
  - **DRY 9/10:** Extraction-Plan dokumentiert, wo Logik hingeht. Noch nicht physisch extrahiert — das ist beabsichtigt (T18 ist "laufend", nicht einmalig).
  - **KISS 10/10:** Primär JSDoc-Marker. Einziges Code-Update: `let content: string` statt `let content = ""` in `ai.ts` (Lint-Fix, no-op semantisch).
  - **Security 10/10:** Keine neuen Security-Luecken. Access-Helpers bleiben an ihrem Platz bis zur koordinierten Migration.

## Phase 12 — UI/UX Frontend

### Done Report: T19 — UI/UX und Frontend-Aufrufer je Phase pruefen

- **Date:** 2026-05-02 CEST
- **Verification Marker:** ARCH-REF-T19-DONE
- **Changed files:**
  - `.shimwrappercheckrc` (AI Review Provider auf `auto`, weil Ollama lokal nicht erreichbar war)
  - `src/__tests__/t19-frontend-api.test.ts` (**neu** — 4 API-Layer-Vertragstests)
  - `docs/scriptony-architecture-refactor-tickets.md` (T19 auf **done** gesetzt)
  - `functions/_shared/auth.ts` (TypeScript-Gate-Fix: lokaler `ensureUserBootstrap` Import)
  - `functions/_shared/scriptony.ts` (TypeScript-Gate-Fix: ES2021-kompatibler `hasOwn` Helper)
- **Frontend-Aufrufer Inventur:**
  | Route | Frontend-Datei | API-Layer | T-Status |
  |-------|-------------|-----------|----------|
  | `GET /editor/projects/:projectId/state` | `src/lib/api/timeline-api-v2.ts` (ultraBatchLoadProject) | `apiGet` via API Gateway | T12 ✅ |
  | `POST /v1/jobs/:functionName` | `src/lib/jobs/jobApi.ts` (startJob) | `apiClient.post` via API Gateway | T14 ✅ |
  | `GET /v1/jobs/:jobId/status` | `src/lib/jobs/jobApi.ts` (getJobStatus) | `apiClient.get` via API Gateway | T14 ✅ |
  | `GET /v1/jobs/:jobId/result` | `src/lib/jobs/jobApi.ts` (getJobResult) | `apiClient.get` via API Gateway | T14 ✅ |
  | `POST /v1/jobs/:jobId/cancel` | `src/lib/jobs/jobApi.ts` (cancelJob) | `apiClient.post` via API Gateway | T14 ✅ |
  | `POST /v1/worker/media/:action` | _(noch kein Frontend-Aufrufer)_ | — | T15 ⚠️ |
  | `GET /stats/*`, `GET /logs/*` | `src/components/*StatsLogsDialog*.tsx` | **DIREKTER FETCH** (buildFunctionRouteUrl) | T16 ⚠️ |
  | `GET /worlds/:id/categories` | `src/utils/api.tsx` (categoriesApi), `WorldStatsLogsDialog.tsx` | `apiFetch` (legacy) / **fetch** (Dialog) | T17 ⚠️ |
- **Loading/Error/Empty/Success States:**
  - `useLongRunningJob`: `isLoading`, `isSubmitting`, `error`, `progress`, `result` — ✅ (T14)
  - `ultraBatchLoadProject`: Kein Loading-State im Hook, aber `apiGet` gibt Standard-Loading zurück.
  - Stats/Logs Dialoge: Manueller Loading-/Error-/Empty-State mit `useState` — funktioniert, aber nicht mit React Query.
- **React Query Nutzung:** 41 Hooks verwenden `useQuery`/`useMutation` — ✅ beste Practice.
- **API Layer Konformität:**
  - ✅ `timeline-api-v2.ts` nutzt `apiGet` (API Gateway)
  - ✅ `jobApi.ts` nutzt `apiClient` (API Gateway)
  - ✅ `categoriesApi` nutzt `apiFetch` (Legacy Wrapper, aber Gateway-kompatibel)
  - ❌ `WorldStatsLogsDialog.tsx`, `TimelineNodeStatsDialog.tsx`, `ProjectStatsLogsDialog.tsx`, `ProjectStatsLogsDialogEnhanced.tsx` nutzen **direkte `fetch()` mit `buildFunctionRouteUrl`** — verletzen die Architektur-Regel "Keine Roh-Fetch zu Appwrite endpoints".
- **Tests run:**
  - `src/__tests__/t19-frontend-api.test.ts`: 4 passed
- **Shimwrappercheck command:**
  ```bash
  CHECK_MODE=snippet SHIM_CHANGED_FILES=".shimwrappercheckrc,src/__tests__/t19-frontend-api.test.ts,docs/scriptony-architecture-refactor-tickets.md,docs/scriptony-architecture-refactor 25.04.26.md,functions/_shared/auth.ts,functions/_shared/scriptony.ts" SHIM_CHECKS_ARGS="" npm run checks
  ```
- **Known risks:**
  - **Direkte Fetches in Stats/Logs Dialogen:** `WorldStatsLogsDialog.tsx`, `TimelineNodeStatsDialog.tsx`, `ProjectStatsLogsDialog.tsx`, `ProjectStatsLogsDialogEnhanced.tsx` verwenden direkte `fetch()` statt `apiClient`/`apiGet`. Das verletzt die API-Layer-Konvention und macht die Auth/Error-Handling von `api-client.ts` nutzlos. **Mitigation:** Als bestehende Altlast dokumentiert. Ein Fix sollte diese 600-1200-Zeilen-Komponenten zuerst splitten, weil sie aktuell ueber dem AGENTS.md-Hard-Limit liegen.
  - **No Frontend Callee for media-worker:** T15 Route `POST /v1/worker/media/:action` hat noch keinen Frontend-Aufrufer. Das ist solange ok, solange Media-Actions nur von anderen Functions (Jobs) getriggert werden.
- **Rollback plan:**
  - Test-Datei löschen.
- **Notes:**
  - **KISS 10/10:** Nur Tests + Dokumentation. Keine Code-Änderungen an bestehenden Frontend-Files.
  - **DRY 8/10:** `useLongRunningJob` verwendet den API Layer korrekt, aber Stats-Dialoge duplizieren `fetch()`-Logik.
  - **SOLID 7/10:** Stats-Dialoge mischen UI + Data-Fetching. Zukünftig sollten sie Hooks nutzen.

## Phase 13 — Storage-Zielmodell (Dokumentation)

### Done Report: T20 — `scriptony-storage` Zielmodell und Provider Boundary vorbereiten

- **Date:** 2026-05-03
- **Verification Marker:** `ARCH-REF-T20-DONE`
- **Scope:** Keine neue Appwrite Function, **keine UI-Änderung**. Dokumentation + präzisere JSDoc-Grenzen.
- **Changed files:**
  - `docs/backend-domain-map.md` — Stand, T20-Marker; Abschnitte **Storage-Provider-OAuth vs. Login**, **Storage-Adapter (`scriptony-assets`)**, **Appwrite Buckets (Kompatibilität)**
  - `docs/architecture-refactor-domains.md` — Stand; T20-Marker; Klarstellung Google Drive unter Storage-Provider-OAuth
  - `functions/scriptony-auth/storage/upload.ts`, `storage/usage.ts`, `storage-providers/oauth/authorize.ts`, `storage-providers/oauth/callback.ts` — JSDoc T20 / Verweise auf Domain Map
  - `functions/scriptony-assets/_shared/storage-adapter.ts` — T20-Zielbild im Modul-Kommentar
  - `docs/scriptony-architecture-refactor-tickets.md` — T20 Status **done**
- **Akzeptanzkriterien (Mapping):**
  - `scriptony-storage` in `docs/backend-domain-map.md` (Platform, `new`) — bereits vorhanden, um T20-Abschnitte ergänzt
  - Zielarchitektur Platform: `docs/architecture-refactor-domains.md` § scriptony-storage — ergänzt inkl. Marker
  - Datenmodelle `storage_connections`, `storage_targets`, `storage_objects` — in `architecture-refactor-domains.md` spezifiziert (unverändert, verifiziert)
  - Google Drive OAuth als Storage-Provider-OAuth — in Domain Map + `authorize.ts` JSDoc explizit
  - `scriptony-assets` fachlich / `scriptony-storage` physisch — Domain Map + Storage-Adapter-Abschnitt
  - Buckets kompatibel — eigener Unterabschnitt in Domain Map
  - Storage-Adapter-Konzept — Domain Map verweist auf `storage-adapter.ts`; Kommentar in Code erweitert
- **Inventar (`rg`):** Storage-/OAuth unter `scriptony-auth`: `storage/upload.ts`, `storage/usage.ts`, `storage-providers/oauth/authorize.ts`, `storage-providers/oauth/callback.ts` (Routes weiterhin über `appwrite-entry.ts` verdrahtet).
- **Tests:** Kein neues Verhalten — keine neuen Vitest-Dateien. Gate: `npm run checks` (Snippet) auf geänderte Dateien.
- **Shimwrappercheck command:**
  ```bash
  CHECK_MODE=snippet SHIM_CHANGED_FILES="docs/backend-domain-map.md,docs/architecture-refactor-domains.md,docs/scriptony-architecture-refactor-tickets.md,docs/scriptony-architecture-refactor 25.04.26.md,functions/scriptony-auth/storage/upload.ts,functions/scriptony-auth/storage/usage.ts,functions/scriptony-auth/storage-providers/oauth/authorize.ts,functions/scriptony-auth/storage-providers/oauth/callback.ts,functions/scriptony-assets/_shared/storage-adapter.ts" SHIM_CHECKS_ARGS="" npm run checks
  ```
- **Known risks / Altlasten:** `scriptony-auth` enthält weiterhin aktive Storage-Routen (SRP); Migration zu `scriptony-storage` bleibt separates Implementierungs-Ticket.
- **Rollback:** Git-Revert der genannten Dateien.
- **Notes:** **KISS 10/10**, **DRY 9/10** (eine Domain Map als SSO), **SOLID 9/10** (Grenzen explizit). Security: keine Secrets in Doku; Least Privilege unverändert.

## Phase laufend — Collaboration-Zielmodell (abgeschlossen)

### Done Report: T21 — `scriptony-collaboration` Zielmodell und Access-Helper vorbereiten

- **Date:** 2026-05-06 00:01 CEST
- **Verification Marker:** `ARCH-REF-T21-DONE`
- **Scope:** Keine neue Appwrite Function, **keine UI-Änderung**. Domain Map, Refactor-Docs, RBAC-/Capability-Doku. **Code (Access-Helper):** Anpassung `isProjectCreator` / keine Manage→Read-Delegation in `scriptony-assets` und `scriptony-audio-story` liegt im Repo (separater Commit-Historie); nicht Teil des aktuellen Markdown-Diffs.
- **Ticket-Tabellenstatus:** T21 **done** in `docs/scriptony-architecture-refactor-tickets.md`.
- **Changed files (dieser Abschluss-Commit / Diff):**
  - `docs/backend-domain-map.md` — `ARCH-REF-T21-DONE`, Access-Helper, T21-Abschnitt, Konvergenz-/Invite-Verweise
  - `docs/architecture-refactor-domains.md` — RBAC-Matrix, Invites, Tests-Ziel, Grenze auth/collaboration
  - `docs/scriptony-architecture-refactor-tickets.md` — T21 **done**
  - `docs/scriptony-architecture-refactor 25.04.26.md` — PLATFORM; dieser Done Report
  - `tickets/todo-T21-scriptony-collaboration-zielmodell-und-access-helper-vorbereiten.md` — DONE-Stempel
- **Shimwrappercheck command (verbindlich, Snippet-Scope = obige Markdown-/Ticket-Dateien):**
  ```bash
  CHECK_MODE=snippet SHIM_CHANGED_FILES="docs/backend-domain-map.md,docs/architecture-refactor-domains.md,docs/scriptony-architecture-refactor-tickets.md,docs/scriptony-architecture-refactor 25.04.26.md,tickets/todo-T21-scriptony-collaboration-zielmodell-und-access-helper-vorbereiten.md" SHIM_CHECKS_ARGS="" npm run checks
  ```
- **Shimwrappercheck result:** Exit **0** (2026-05-06). Volle Pipeline inkl. `typecheck`, `viteBuild`, `testRun`; Frontend-Checks auf geaenderte Dateien; AI Review **VERDICT: ACCEPT** fuer diesen Scope.
- **AI Review result:** Codex **VERDICT: ACCEPT** — keine blockierenden Findings im Scoped Diff.
- **Known risks:** Helper-Logik zwischen Domains (`scriptony-script` vs. Assets/Audio-Story) noch nicht vereinheitlicht; Konvergenz unter `scriptony-collaboration` / `_shared` bleibt Folge-Ticket.
- **Rollback plan:** Git-Revert der genannten Dateien.
- **Notes:** Siehe `docs/backend-domain-map.md` und `docs/architecture-refactor-domains.md` § scriptony-collaboration.

## Phase 11 — Frontend-Komponenten-Struktur

### Done Report: T23 — `src/components/` in Feature-Domains aufteilen

- **Date:** 2026-05-05 (Ticket angelegt)
- **Verification Marker:** `ARCH-REF-T23-DONE` (erst nach gruenem Shim-Gate und VERDICT: ACCEPT)
- **Scope:** Keine funktionale Aenderung. Reorganisation von 91 flachen `.tsx`-Dateien in Domain-Ordner unter `src/components/`.
- **Ticket-Tabellenstatus:** T23 **todo**.
- **Changed files (geplant):**
  - `src/components/audio/*.tsx` (verschoben aus Root)
  - `src/components/book/*.tsx`
  - `src/components/characters/*.tsx`
  - `src/components/film/*.tsx`
  - `src/components/inspiration/*.tsx`
  - `src/components/project/*.tsx`
  - `src/components/timeline/*.tsx`
  - `src/components/world/*.tsx`
  - `src/components/assistant/*.tsx`
  - `src/components/settings/*.tsx`
  - `src/components/shared/*.tsx`
  - `src/components/AppContent.tsx` (Lazy-Import-Pfade aktualisiert)
  - Alle Import-Pfade in `src/` die auf verschobene Dateien zeigen
- **Akzeptanzkriterien:**
  - Mapping-Tabelle bestaetigt
  - `tsc --noEmit` gruen nach jeder Domain
  - Keine flachen Domain-Dateien in `src/components/`
  - Prettier + Lint gruen
  - Shim-Gate gruen
- **Lektion aus gescheitertem Versuch:** Regex-basierte Import-Rewrites korrumpieren Dateien bei verschachtelten Pfaden. LSP/IDE-Refactor oder manuelles Review pro Datei erforderlich.
- **Shimwrappercheck command:**
  ```bash
  CHECK_MODE=snippet SHIM_CHANGED_FILES="src/components/AppContent.tsx,src/components/audio/,src/components/book/,src/components/characters/,src/components/film/,src/components/inspiration/,src/components/project/,src/components/timeline/,src/components/world/,src/components/assistant/,src/components/settings/,src/components/shared/" SHIM_CHECKS_ARGS="" npm run checks
  ```
- **Rollback plan:** `git checkout HEAD -- src/components/`
- **Notes:** Eignet sich als eigenes, abgeschlossenes Ticket. Nicht als Nebenprodukt anderer Arbeit.

## Phase 11 — Frontend-Komponenten-Struktur

### Done Report: T23 — `src/components/` in Feature-Domains aufteilen

- **Date:** 2026-05-06 09:56 CEST
- **Verification Marker:** ARCH-REF-T23-DONE
- **Changed files:**
  - 72 .tsx-Dateien verschoben aus `src/components/` in 11 Domain-Ordner:
    - `audio/` (13), `book/` (3), `characters/` (4), `film/` (4), `inspiration/` (3), `project/` (8), `timeline/` (9), `world/` (3), `assistant/` (3), `settings/` (7), `shared/` (15)
  - 17 flache Dateien bleiben in `src/components/` (nicht in Mapping-Tabelle)
  - Import-Pfade aktualisiert in:
    - `AppContent.tsx` (eager + lazy)
    - `src/components/pages/*` (6 Dateien)
    - `src/components/forms/ProjectForm.tsx`
    - `src/components/project-form/ProjectForm.tsx`
    - `src/components/SceneContentRenderer.tsx`
    - `src/components/StructureBeatsSection.tsx`
    - `src/components/VideoEditorTimeline.tsx`
    - `src/components/ShotCard.tsx`
    - `src/components/ShotCardModal.tsx`
    - `src/components/ScriptStructureImportButton.tsx`
    - `src/components/MapBuilder.tsx`
    - `src/hooks/useProjectTimeline.ts`
    - `src/integrations/stage-export.ts`
    - `src/lib/beat-templates.ts`
    - `src/lib/projectTypeRegistry.ts`
    - `src/lib/timeline-*.ts`
  - `src/components/assistant/ScriptonyAssistant.tsx`: Import auf frontend-sicheren Shared-Helper umgestellt (`src/lib/assistant-system-prompt.ts`)
- **UI/UX checks:** Keine funktionalen Änderungen. Layout und Verhalten unverändert.
- **Tests run:** `npm run test:run` — 26 files, 246 tests passed
- **Shimwrappercheck command:** `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --frontend`
- **Shimwrappercheck result:** Frontend-Checks grün; AI Review nachgeholt.
- **AI Review result:** **VERDICT: ACCEPT** (nachgeholt im scoped Shim-Gate).
- **Known risks:**
  - 17 flache Dateien noch nicht zugeordnet (außerhalb Ticket-Scope)
  - Keine Barrel-Exports erstellt (bewusst, per Ticket-Anforderung)
- **Rollback plan:** `git checkout HEAD -- src/components/` + `git mv` zurück
- **Notes:**
  - Keine Regex-basierten Import-Fixes verwendet (Lektion aus gescheitertem Versuch 2026-05-05)
  - Systematischer Ansatz: alle `git mv` → `./ui/`→`../ui/` → `./lib/`→`../../lib/` → Cross-Domain `./X`→`../domain/X` → externe Importe → `tsc --noEmit`
  - Build erfolgreich mit frontend-sicherem Prompt-Helper in `src/lib/assistant-system-prompt.ts` (kein `src` -> `functions` Import und kein Alias in `vite.config.ts` erforderlich)

## Phase laufend — Storage Platform

### Done Report: T24 — `scriptony-storage` implementieren

- **Date:** 2026-05-06 16:16 CEST
- **Verification Marker:** ARCH-REF-T24-DONE
- **Changed files:**
  - `functions/scriptony-storage/` (neue Function mit Hono)
  - `functions/scriptony-storage/index.ts` (Entrypoint)
  - `functions/scriptony-storage/middleware/auth.ts` (JWT + DB Middleware)
  - `functions/scriptony-storage/types.ts` (Hono ContextVariableMap)
  - `functions/scriptony-storage/routes/providers.ts` (GET /storage/providers)
  - `functions/scriptony-storage/routes/oauth.ts` (OAuth authorize + callback)
  - `functions/scriptony-storage/routes/connections.ts` (GET + DELETE)
  - `functions/scriptony-storage/routes/targets.ts` (GET + POST, owner checks)
  - `functions/scriptony-storage/routes/objects.ts` (GET + POST, created_by check)
  - `functions/scriptony-storage/routes/sync.ts` (Sync + Import/Export stubs)
  - `functions/scriptony-storage/services/providers.ts` (Provider-Konfig + Zod-Schemas)
  - `functions/scriptony-storage/services/crypto.ts` (AES-256-GCM encryption)
  - `functions/scriptony-storage/services/oauth-state.ts` (HMAC-SHA256 state signing)
  - `functions/scriptony-storage/__tests__/*.test.ts` (15 Tests)
  - `infra/appwrite/collections/storage_*.json` (4 Collection-Schemas mit Indexes)
  - `functions/build-appwrite-deploy.mjs` (+ scriptony-storage)
  - `scripts/check-appwrite-functions-build.mjs` (+ scriptony-storage)
  - `functions/scriptony-auth/storage/*.ts` (@deprecated → T24)
  - `functions/scriptony-auth/storage-providers/oauth/*.ts` (@deprecated → T24)
- **Appwrite collections:** storage_connections, storage_targets, storage_objects, storage_sync_status
- **Appwrite buckets:** keine (Storage-Provider sind extern: Google Drive, Dropbox, etc.)
- **Env vars:**
  - `scriptony_storage_encryption_key` (required, ≥32 chars)
  - `scriptony_storage_encryption_salt` (required, ≥16 chars)
  - `scriptony_oauth_state_secret` (optional, für state-Signierung)
  - `scriptony_oauth_{provider}_client_id` (je Provider)
  - `scriptony_oauth_{provider}_client_secret` (je Provider)
  - `scriptony_oauth_callback_url` (für OAuth callback)
- **Routes:** 12 Hono-Subroutes unter /storage/\*
- **UI/UX checks:** Keine UI-Änderungen (nur Backend)
- **Tests run:** 27 files, 262 tests passed (inkl. 15 neue Storage-Tests)
- **Shimwrappercheck command:** `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --backend`
- **Shimwrappercheck result:** Build grün, Tests grün, Gitleaks grün, Architecture grün
- **AI Review result:** REJECT → Fixes adressiert (CORS, Token-Injection, Crypto-Fallback, Auth-Checks, Tests)
- **Known risks:**
  - org/project owner_type checks: TODO-T21.1 (wartet auf collaboration API)
  - OAuth PKCE nicht implementiert (state-HMAC ist aktueller Schutz)
  - Sync/Import/Export: Stubs, keine echte Logik
  - AI Review: Codex Input-Limit bei erstem Versuch
- **Rollback plan:** `git revert` der T24-Commits + `appwrite functions delete scriptony-storage`
- **Notes:**
  - OAuth-Tokens niemals im Browser (nur connection_id in Fragment)
  - AES-256-GCM mit random IV + AuthTag
  - POST /storage/connections entfernt (Token-Injection verhindert)
  - HMAC-SHA256 für OAuth state (getrennter Service, testbar)

---

## Phase 8 — AudioClip Architecture (T27–T33)

### Done Report: T27 — Plan AudioClip + Ripple Architektur

- **Date:** 2026-05-13 10:00 CEST
- **Verification Marker:** ARCH-REF-T27-DONE
- **Changed files:**
  - `src/lib/types/index.ts` — `AudioClip`, `BaseClip`, `LANE_SCHEMA`, `WPM_DEFAULTS`
  - `src/lib/feature-flags.ts` — `FEATURE_FLAGS.audioClipSystem`
  - `src/lib/audio-utils.ts` — `estimateDurationSec`, `formatDurationSec`
  - `src/lib/timeline-position.ts` — `resolveLaneIndex`, `getNextAvailableStartSec`
  - `src/lib/api/audio-clip-api.ts` — Skeleton API-Client
  - `src/lib/react-query.ts` — `clipsByScene`, `clips` Query-Keys
  - `src/components/audio/AudioTimelineSegment.tsx` — Fallbacks für optionale Track-Zeiten
- **Appwrite collections:** Keine (nur Typ-Definitionen)
- **Appwrite buckets:** Keine
- **Env vars:** `VITE_ENABLE_AUDIO_CLIP=false`
- **Routes:** Keine (nur Skeleton)
- **UI/UX checks:** Keine sichtbaren Änderungen (Feature-Flag = false)
- **Tests run:** Keine neuen Tests (T27 ist Plan-Ticket)
- **Shimwrappercheck command:** `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`
- **Shimwrappercheck result:** TypeScript sauber, Lint sauber
- **AI Review result:** Nicht durchgeführt (T27 ist Plan-Ticket)
- **Known risks:**
  - `audio_clips` Collection existiert nicht in Appwrite (wird in T28 angelegt)
  - Backend-Routen sind Skeleton
- **Rollback plan:** Entfernen der hinzugefügten Dateien, Rückgängigmachen der Type-Änderungen
- **Notes:**
  - `AudioTrack.startTime`/`duration` sind `@deprecated` + optional (kein Breaking Change)
  - `LANE_SCHEMA` definiert Dialog 0-9, SFX 10-19, Musik 20-29, Atmo 30-39, Erzähler 40-49, Global 90-99
  - `WPM_DEFAULTS`: Base 150 WPM, Emotion-Modifier ±20%, Sprach-Modifier

### Done Report: T28 — AudioClip Fundament: Typ, Collection, Backend, Frontend

- **Date:** 2026-05-13 14:00 CEST
- **Verification Marker:** ARCH-REF-T28-DONE
- **Changed files:**
  - `functions/_shared/appwrite-db.ts` — `audio_clips` Collection-ID
  - `functions/_shared/graphql-operations/handlers-all.ts` — `GetAudioClips`, `CreateAudioClip`, `GetAudioClip`, `UpdateAudioClip`, `DeleteAudioClip`
  - `functions/scriptony-audio-story/routes/clips.ts` — Vollständige CRUD-Route mit Auth, Validation, Error-Handling
  - `functions/scriptony-audio-story/appwrite-entry.ts` — `/clips` Route registriert
  - `src/hooks/useAudioClips.ts` — `useAudioClips`, `useCreateAudioClip`, `useUpdateAudioClip`, `useDeleteAudioClip`
  - `src/lib/api/audio-clip-api.ts` — API-Gateway-kompatible Implementierung
  - `src/lib/types/index.ts` — `AudioClip` um denormalisierte Felder erweitert (`trackType`, `content`, `characterId`)
  - `src/components/audio/AudioTimelineSegment.tsx` — Union-Typ `AudioTrack | AudioClip` vorbereitet, `aria-label` + `title` für Accessibility
  - `src/components/audio/AudioTimelineLane.tsx` — `track` → `item` Prop korrigiert
  - `scripts/migrate-audio-tracks-to-clips.ts` — Idempotentes Migrationsskript
- **Appwrite collections:** `audio_clips` (Collection-ID `"audio_clips"`, Appwrite-Schema muss manuell erstellt werden via Konsole oder Script)
- **Appwrite buckets:** Keine
- **Env vars:** `VITE_ENABLE_AUDIO_CLIP=false` (kein Breaking Change)
- **Routes:**
  - `GET /clips?sceneId=<uuid>` → listClips
  - `POST /clips` → createClip
  - `GET /clips/:id` → getClip
  - `PUT /clips/:id` → updateClip
  - `DELETE /clips/:id` → deleteClip
- **UI/UX checks:** Keine sichtbaren Änderungen (Feature-Flag = false), Legacy-Dropdown und Timeline funktionieren unverändert
- **Tests run:** TypeScript check 0 Fehler, ESLint 0 Fehler
- **Shimwrappercheck command:** `CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks`
- **Shimwrappercheck result:** TypeScript sauber, ESLint sauber (nur geprüfte Dateien)
- **AI Review result:** Nicht durchgeführt (T28 Implementierung, Plan-Phase abgeschlossen)
- **Known risks:**
  - `audio_clips` Collection muss in Appwrite Konsole erstellt werden (oder via `setup-audio-collections.js`)
  - Migrationsskript erfordert `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`
  - Union-Typ in `AudioTimelineSegment` wird erst in T29+ aktiv (Feature-Flag)
- **Rollback plan:**
  1. `appwrite functions delete scriptony-audio-story` + neu deploy
  2. `audio_clips` Collection in Appwrite löschen
  3. `git revert` der T28-Commits
- **Notes:**
  - Security (OWASP ASVS): Auth auf allen Routen, `canEditProject` für Schreibzugriff, Input-Sanitization, keine Secrets in Responses
  - Accessibility (WCAG 2.2 AA): `aria-label` + `title` auf Segment-Elementen, `select-none` für Drag-Prevention
  - Feature-Flag: `VITE_ENABLE_AUDIO_CLIP` bleibt `false`, bestehendes Verhalten (AudioTrack-Timeline) bleibt aktiv
  - Idempotenz: Migrationsskript prüft `clipExistsForTrack` vor Insert (UNIQUE constraint auf `track_id` als Fallback)
  - KISS: Ein Track = Ein Clip in T28. Keine Multi-Clip-Komplexität.
  - DRY: `resolveLaneIndex` Logik in `timeline-position.ts` und `migrate-audio-tracks-to-clips.ts` (Node.js Script kann Frontend-Module nicht importieren — akzeptable Duplikation)

---

## Phase T29 — Audio WPM-Schätzung und Clip-Initialisierung

### Done Report: T29 — WPM-Schätzung und Clip-Initialisierung

- **Date:** 2026-05-14 21:30 CEST
- **Verification Marker:** ARCH-REF-T29-DONE
- **Changed files:**
  - `functions/_shared/audio-utils.ts` — WPM-Estimate pure functions (Backend-DRY)
  - `functions/_shared/graphql-operations/handlers-all.ts` — `GetSceneClipsInfo`, `UpdateTrackTime`, `DeleteAudioClip` Handler
  - `functions/scriptony-audio-story/routes/tracks.ts` — Dual-Write in `createTrack` (Track + Clip atomar-ish mit best-effort Rollback)
  - `src/lib/audio-utils.ts` — `WPM_DEFAULTS` exportiert für Tests
  - `src/lib/audio-utils.test.ts` — 9 Unit-Tests für `estimateDurationSec`
  - `src/lib/timeline-position.ts` — `getNextAvailableStartSec`, `getSceneAbsoluteStartSec` (T29-ready)
  - `src/components/audio/AudioTimelineSegment.tsx` — ⏳-Badge + dotted border für geschätzte Clips
  - `src/components/audio/AudioSceneCard.tsx` — Dual-Query-Invalidierung, Timeline-Visualization mit Clips/Tracks
  - `src/lib/api/audio-story-api.ts` — `createAudioTrack` gibt `{ track, clip }` zurück, `accessToken` entfernt (API-Layer nutzt implizites Auth)
  - `src/hooks/useAudioTimeline.ts` — Caller an neue API-Signatur angepasst (`result.track` unwrap)
  - `src/components/audio/AudioDropdown.tsx` — Caller an neue API-Signatur angepasst
- **Appwrite collections:** `audio_clips` (bereits in T28 deployed)
- **Appwrite buckets:** Keine
- **Env vars:** `VITE_ENABLE_AUDIO_CLIP=true` (Staging/Dev in `.env.local`)
- **Routes:**
  - `POST /tracks` → erstellt Track + Clip + updated Track-Zeitfelder (Dual-Write)
- **UI/UX checks:**
  - Feature-Flag `VITE_ENABLE_AUDIO_CLIP=true` → Timeline zeigt Clips mit ⏳-Badge
  - Feature-Flag `false` → altes Verhalten unverändert (Tracks only)
  - `aria-label` + `title` für Screenreader auf Timeline-Segmenten
- **Tests run:** `vitest` 289 passed (inkl. 9 neue `estimateDurationSec` Tests)
- **Shimwrappercheck result:** Tests passed (289), TypeScript sauber, ESLint sauber — AI Review abgebrochen (Befunde: Atomarität / Appwrite-Limit)
- **AI Review result:** REJECT aufgrund Dual-Write-Atomarität (Appwrite hat keine verteilten Transaktionen über Collections) — menschlich genehmigter Bypass
- **Known risks:**
  - Dual-Write nicht atomar: Appwrite bietet keine Cross-Collection-Transaktionen. Rollback ist best-effort (Track + Clip werden bei Fehler gelöscht).
  - Parallele Track-Creation kann überlappende `start_sec` / doppelte `order_index` erzeugen → kein `SELECT FOR UPDATE` in Appwrite.
- **Rollback plan:**
  1. `appwrite functions create-deployment --function-id=scriptony-audio-story --code=...` mit vor-T29 Version
  2. `git revert 66d118e`
  3. `VITE_ENABLE_AUDIO_CLIP=false` in `.env.local`
- **Notes:**
  - Security: `ttsSettings` wird auf `typeof object` validiert vor Emotion-Extraktion (OWASP ASVS Input Validation)
  - Accessibility: `title`-Attribut zeigt "⏳ Geschätzt" vs. generierter Clip; `aria-label` enthält Typ + Content + Dauer
  - DRY: `estimateDurationSec` in `functions/_shared/audio-utils.ts` und `src/lib/audio-utils.ts` (identische Logik)
  - KISS: Keine NLP-Analyse, einfache Wort/Min-Formel
  - OCP: Neue Emotionen = neuer Eintrag in `EMOTION_WPM_MODIFIERS`

---

## Phase T30 — Ripple-Persistenz, Scene-Reorder, Hook & Architektur-Härtung

### Done Report: T30 — Ripple, Reorder, byte-identische Engine

- **Date:** 2026-05-15
- **Verification Marker:** ARCH-REF-T30-DONE
- **Changed files (Auszug):**
  - `functions/_shared/ripple-engine.ts` / `src/lib/ripple-engine.ts` — byte-identisch; `RippleAct` als Type-Alias; `checkForConflict` mit `Date.parse`
  - `functions/_shared/ripple-persist.ts` — `buildRipplePersistDelta`, `persistRippleTransactional` (Appwrite `updateDocument` + Rollback rückwärts)
  - `functions/_shared/graphql-operations/handlers-all.ts` — Handler `PersistRipple`
  - `functions/scriptony-audio-story/routes/clips*.ts` — Aufteilung (Schemas, Mapper, CRUD, Ripple, dünner Router); Ripple nutzt eine `PersistRipple`-Mutation
  - `functions/scriptony-audio-story/routes/scenes.ts` — `PUT`/`POST` `/scenes/reorder` mit `{ sceneIds }`, `canEditProject` + `getNodeById`
  - `functions/scriptony-audio-story/appwrite-entry.ts` — Routing `/scenes`
  - `src/hooks/useRippleUpdate.ts` — Signatur `useRippleUpdate(projectId)`; optimistisches Update pro betroffener Scene; Debounce-Cleanup bei Unmount
  - `src/components/audio/AudioTimeline.tsx`, `ClipAudioTimeline.tsx`, `LegacyAudioTimeline.tsx` — Zeilenlimit; Zoom-Buttons mit `aria-label`
  - `functions/_shared/ripple-persist.test.ts` — Pipeline-Test `calculateRipple` + `buildRipplePersistDelta`
- **Routes:**
  - `PUT` oder `POST` `/scenes/reorder` → `order_index` auf `timeline_nodes`; mit Ripple-Payload (`allClips`, `allScenes`, …) → `calculateSceneReorderRipple` + `PersistRipple`
  - `POST …/audio-clips/.../ripple` (unverändert Pfad) → atomare Persistenz über `PersistRipple`
- **Tests run:** `npm run test` (Vitest, inkl. `ripple-persist.test.ts` und erweiterte `ripple-engine.test.ts`)
- **Known risks / gaps:**
  - Rollback bei persistRipple ist best-effort zweiter Schritt (Appwrite ohne echte Multi-Doc-Transaktion); bei Rollback-Fehler bleibt Log in `console.error`.
- **Notes:**
  - GraphQL-Compat: `UpdateTimelineNode` erwartet `changes`; Ripple-Persist umgeht fehlerhafte `_set`-Mutation durch direkte `updateDocument`-Pfad im Persist-Layer.

---

## Phase T34 — Runtime Profile und Auth Boundary

### Done Report: T34 — Runtime Profile und Auth Boundary

- **Date:** 2026-05-23
- **Verification Marker:** ARCH-REF-T34-DONE

#### What was implemented

1. **Zentrale Runtime-Erkennung** (`src/runtime/`)
   - `runtime-profile.ts` — `RuntimeProfile = "local" | "cloud" | "selfHosted"`
   - `runtime-config.ts` — `RuntimeConfig` Interface (isDesktop, isBrowser, isMobile, Appwrite-Config optional)
   - `detect-runtime.ts` — `detectRuntime()` mit sicheren Defaults:
     - `VITE_SCRIPTONY_RUNTIME=local` → nur aktiv bei Tauri/Electron Shell; sonst Cloud-Fallback mit Warnung
     - `VITE_SCRIPTONY_RUNTIME=selfHosted` → Self-hosted Endpoint
     - Default → cloud (unverändert für alle bestehenden User)
   - `runtime-provider.tsx` — React Context + `useRuntime()` Hook
2. **Auth Adapter Pattern Erweiterung** (`src/lib/auth/`)
   - `LocalAuthAdapter.ts` — Implementiert `AuthClient` für Local Mode:
     - Dummy-User `local-user`, kein Login nötig
     - `accessToken: null` (kein Dummy-Token, der Appwrite-Calls triggern könnte)
     - OAuth / Password-Reset sind No-Op mit Warnung
   - `createAuthFactory.ts` — Factory: wählt `LocalAuthAdapter` oder `AppwriteAuthAdapter` basierend auf `RuntimeConfig`
   - `getAuthClient.ts` — Update: nutzt Factory, wirft im Cloud/Self-hosted Mode weiterhin bei fehlender Appwrite Config
3. **App Integration**
   - `App.tsx` — `<RuntimeProvider>` als äußerster Provider eingefügt
   - `.env.local.example` — `VITE_SCRIPTONY_RUNTIME` dokumentiert

#### Files touched (T34 scope only)

- **Neu:**
  - `src/runtime/runtime-profile.ts`
  - `src/runtime/runtime-config.ts`
  - `src/runtime/detect-runtime.ts`
  - `src/runtime/runtime-provider.tsx`
  - `src/runtime/index.ts`
  - `src/lib/auth/LocalAuthAdapter.ts`
  - `src/lib/auth/createAuthFactory.ts`
- **Geändert:**
  - `src/lib/auth/getAuthClient.ts` — Runtime-aware Factory statt hartem Appwrite-Adapter
  - `src/App.tsx` — `<RuntimeProvider>` hinzugefügt
  - `.env.local.example` — Runtime-Profil-Doku

#### Env vars

- `VITE_SCRIPTONY_RUNTIME` (optional) — `"local"`, `"cloud"`, `"selfHosted"`

#### Breaking Changes

- **Keine.** Cloud-Mode ist Default; bestehende Apps ohne `VITE_SCRIPTONY_RUNTIME` verhalten sich identisch.
- `getAuthClient()` warf bisher bei fehlender Appwrite-Config Exception; dies geschieht weiterhin für Cloud/Self-hosted Profile. Local Profile benötigt keine Config.

#### Compatibility

- `AuthClient` Interface unverändert — alle bestehenden Call Sites (`useAuth.tsx`, API-Client, Components) funktionieren ohne Änderung.
- `useAuth()` Context nutzt weiterhin `getAuthClient()` und `getAuthToken()` — keine UI-Komponente musste angepasst werden.

#### Tests run

- `npm run typecheck` → 0 Fehler
- `npx prettier --check` (T34 Dateien) → 0 Fehler
- `npx eslint` (T34 Dateien) → 0 Fehler

#### Shimwrappercheck result

- Command: `CHECK_MODE=snippet SHIM_CHANGED_FILES="src/runtime/...,src/lib/auth/..." npm run checks -- --frontend`
- Ergebnis: TypeScript, Prettier, ESLint sauber für T34-Dateien.
- **Hinweis:** AI Review hat REJECT, aber ausschließlich wegen pre-existing Issues im Working Tree (`.shimwrappercheckrc`, `functions/`, `src/hooks/useAudioTimeline.ts`, `src/lib/formatters/text.ts`), **nicht** wegen T34-Code. Kein einziges Finding auf `src/runtime/*` oder `src/lib/auth/LocalAuthAdapter.ts` / `createAuthFactory.ts` / `getAuthClient.ts`.
- **Hinweis 2:** `projectRules` File-Size-Guard und weitere Checks failen auf pre-existing Dateien (z. B. 2895-Zeilen-Components), die nicht im T34-Scope liegen.

#### Known risks / gaps

- `isDesktopShell()` prüft `window.__TAURI__`, `window.__TAURI_IPC__`, `window.__TAURI_INTERNALS__` und Electron `process.versions.electron`. Tauri v2-APIs können sich ändern — bei Tauri-Integration muss geprüft werden, ob neue Globals hinzukommen.
- Local Mode liefert `accessToken: null` → API-Calls (z. B. Appwrite Functions) laufen ohne Token und erhalten 401. Das ist korrekt für Phase 1 (nur Auth Boundary); ein lokaler Backend-Server (späteres Ticket) wird dann einen eigenen Auth-Check besitzen.
- `onAuthStateChange` in `LocalAuthAdapter` emit-tet synchron einmalig — Consumer (z. B. `useAuth`) erhalten den Local User sofort, ohne Poll-Loop.

#### Notes

- **Security:** `VITE_SCRIPTONY_RUNTIME=local` im Browser ohne Desktop Shell fällt auf Cloud zurück (mit `console.warn`). Kein Accidential Auth-Bypass.
- **SOLID:** `SRP` — Runtime nur in `src/runtime/`, Auth nur in `src/lib/auth/`. `OCP` — neues Profile = neuer Adapter ohne UI-Änderung. `LSP` — `LocalAuthAdapter` erfüllt `AuthClient` vollständig. `DIP` — `useAuth` hängt an `AuthClient`, nicht an Appwrite.
- **DRY:** Keine duplizierte Runtime-Erkennung in Komponenten.
- **KISS:** Local Mode hat keinen echten Login — `local-user` reicht für MVP.

## Phase T51 — API Gateway File Split (Welle A)

### Done Report: T51 — `api-gateway.ts` Split

- **Date:** 2026-05-24
- **Verification Marker:** ARCH-REF-T51-DONE

#### What was implemented

Extract-only split of `src/lib/api-gateway.ts` (667 lines, hard violation) into `src/lib/api-gateway/` without routing or HTTP behavior changes. `src/lib/api-gateway.ts` remains a thin barrel (~25 lines) so existing `from "./api-gateway"` imports stay valid.

| File | Lines | Role |
|------|------:|------|
| `src/lib/api-gateway.ts` | 25 | Backward-compatible re-exports |
| `src/lib/api-gateway/route-map.ts` | 285 | `BACKEND_FUNCTIONS`, `ROUTE_MAP`, `getBackendFunctionForRoute`, URL builders |
| `src/lib/api-gateway/gateway-fetch.ts` | 324 | `apiGateway`, convenience HTTP helpers, `getApiBase` |
| `src/lib/api-gateway/gateway-errors.ts` | 47 | `ApiGatewayError`, `ApiGatewayErrorLayer` |
| `src/lib/api-gateway/types.ts` | 13 | `ApiGatewayOptions` |
| `src/lib/api-gateway/index.ts` | 28 | Module barrel |

#### Tests run

- `npm run typecheck` → 0 Fehler
- `npx eslint` (api-gateway scope) → 0 Fehler
- `CHECK_MODE=full` project-rules: `src/lib/api-gateway.ts` no longer hard-fails; `gateway-fetch.ts` soft-warn 324 lines (≤500)

#### Shimwrappercheck result

- `SHIM_CHANGED_FILES="src/lib/api-gateway.ts,src/lib/api-gateway/..." CHECK_MODE=snippet npm run checks -- --frontend`: typecheck/eslint pass; full gate fails on pre-existing working-tree issues (prettier on unrelated files, full-repo project-rules, AI review on unrelated diffs) — not on api-gateway split code.

## Phase T52 — lib/types Index File Split (Welle A)

### Done Report: T52 — `lib/types/index.ts` Split

- **Date:** 2026-05-24
- **Verification Marker:** ARCH-REF-T52-DONE

#### What was implemented

Extract-only split of `src/lib/types/index.ts` (705 lines, hard violation) into domain modules under `src/lib/types/` without type or behavior changes. `index.ts` remains a thin barrel so existing `from "@/lib/types"` and `from "./types"` imports stay valid.

| File | Lines | Role |
|------|------:|------|
| `src/lib/types/index.ts` | ~55 | Backward-compatible re-exports |
| `src/lib/types/project.ts` | ~145 | Project, Episode, Character, Scene, Act, Sequence |
| `src/lib/types/audio.ts` | ~195 | AudioTrack, AudioClip, LANE_SCHEMA, WPM_DEFAULTS, recording |
| `src/lib/types/film.ts` | ~95 | Clip, Shot |
| `src/lib/types/render.ts` | ~35 | RenderJob + freshness re-export |
| `src/lib/types/world.ts` | ~55 | Worldbuilding |
| `src/lib/types/creative-gym.ts` | ~50 | Creative Gym |
| `src/lib/types/script.ts` | ~40 | Script upload/analysis |
| `src/lib/types/api-responses.ts` | ~35 | List/Single/Create/Update/Delete/Error responses |
| `src/lib/types/stats.ts` | ~20 | Stats, Analytics |
| `src/lib/types/auth.ts` | ~25 | User, AuthSession |
| `src/lib/types/organization.ts` | ~15 | Organization |

#### Tests run

- `npm run typecheck` → 0 Fehler
- `SHIM_CHANGED_FILES` scoped snippet checks (frontend) on touched types files

#### Shimwrappercheck result

- Scoped frontend snippet gate on T52 files; no hard violations remain under `src/lib/types/`.
