# T26: Smoke Test — AudioDropdown Hierarchie-CRUD

## Voraussetzungen

- Vite Dev-Server läuft (`npx vite --port 3000 --strictPort`)
- Hörspiel-Projekt existiert in der Datenbank
- Film-Projekt existiert (für Regressionstest)

## Test 1: Akt erstellen

1. Hörspiel-Projekt öffnen → Dropdown-Ansicht
2. Wenn leer: "+ Akt hinzufügen" Button sichtbar → klicken
3. Neuer Akt erscheint mit Standard-Titel "Akt 1"
4. Akt aufklappen → leer, "0 Sequenzen" angezeigt

## Test 2: Sequenz erstellen

1. Akt aufklappen
2. "+ Sequenz hinzufügen" Button klicken
3. Neue Sequenz erscheint mit Standard-Titel "Sequenz 1"
4. Sequenz aufklappen → leer, "0 Szenen" angezeigt

## Test 3: Szene erstellen

1. Sequenz aufklappen
2. "+ Szene hinzufügen" Button klicken
3. Neue Szene erscheint mit Standard-Titel "Szene 1"
4. Szene aufklappen → "Keine Audio-Tracks vorhanden" + Track-Selector

## Test 4: Titel bearbeiten (Inline-Editing)

1. Auf Akt-Titel klicken → wird editierbar
2. Titel ändern → Enter oder Klick außerhalb
3. Titel wird gespeichert (Page-Reload zeigt neuen Titel)

## Test 5: Löschen

1. Akt/Sequenz/Szene löschen Button klicken
2. Bestätigungsdialog erscheint → bestätigen
3. Element verschwindet aus der Hierarchie

## Test 6: Duplizieren

1. Akt duplizieren → Kopie erscheint mit nächster Nummer
2. Kind-Elemente (Sequenzen, Szenen) werden mitkopiert

## Test 7: AudioTrack (Regression)

1. Szene aufklappen → Track-Selector (Dialog/Musik/SFX/Atmo/Erzähler)
2. Track hinzufügen → Track erscheint in der Szene
3. Play/Pause funktioniert

## Test 8: Labels korrekt

| Projekttyp | Akt | Sequenz | Szene |
|---|---|---|---|
| Hörspiel | Akt | Sequenz | Szene |
| Buch | Akt | Kapitel | Abschnitt |
| Film | Akt | Sequence | Szene |

## Test 9: Film-Regression

1. Film-Projekt öffnen → Dropdown
2. Akt/Sequenz/Szene/Shot hinzufügen → funktioniert wie vorher
3. Keine visuellen oder funktionalen Regressionen

## Test 10: Empty State

1. Neues Hörspiel-Projekt erstellen (keine Acts)
2. Dropdown zeigt "+ Akt hinzufügen" Button statt "Keine Acts vorhanden"
3. Button klickbar → erster Akt wird erstellt