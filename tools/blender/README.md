# Scriptony Blender Tools

Dieses Verzeichnis enthält die Blender-Integration für Scriptony.

## Struktur

```
tools/blender/
├── addon/              # Legacy Blender Add-on (Python)
│   ├── __init__.py
│   ├── api.py
│   ├── constants.py
│   ├── operators.py
│   ├── server.py
│   └── ui.py
├── extension/          # Blender 4.2+ Extension (Manifest)
│   └── blender_manifest.toml
├── dist/               # Build-Artefakte (*.zip) – wird nicht committed
├── scripts/            # Build- & Verify-Scripts
│   ├── build.sh
│   └── verify.sh
└── README.md           # Diese Datei
```

## Scripts

Die Build- und Verify-Scripts befinden sich jetzt unter `tools/blender/scripts/`.

```bash
# Build
npm run addon:zip          # Legacy-ZIP	npm run addon:zip:extension  # Extension-ZIP
npm run addon:zip:all      # Beide

# Verify
npm run addon:verify       # Stuktur-Check + optional Blender-Smoke-Test
```

## Deployment

Die gebauten Zips landen automatisch in `public/` (für Frontend-Downloads)
und in `tools/blender/dist/`.
