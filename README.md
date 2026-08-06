# FrameTrack

Windows-Desktop-Anwendung zur lokalen, projektbezogenen Erfassung aktiver Fenster (Tauri 2, Rust, React, SQLite).

## Entwicklung starten

```bash
cd tauri-app
npm install
npm run tauri dev
```

## Tests ausführen

Automatisierte Unit- und Integrationstests für die Rust-Workspace-Crates:

```bash
cargo test -p frametrack-core -p frametrack-db -p frametrack-tracking -p tauri-app
```

Einzelne Bereiche:

```bash
# Kernlogik (Klassifikation, Kontext)
cargo test -p frametrack-core

# SQLite-Persistenz inkl. Integrationstests (In-Memory)
cargo test -p frametrack-db

# Minuten-Aggregation und Windows-Tracking-Hilfen
cargo test -p frametrack-tracking

# Export-Payload und CSV-Escaping
cargo test -p tauri-app
```

**Abdeckung (Stand August 2026):** 36 automatisierte Tests – Kontextbildung, Dwell-Aggregation, Schema-Migration, Minuten-Aggregation, SQLite-Integration (Filter, Paginierung, Löschen) sowie JSON-Export. UI- und Ende-zu-Ende-Tests sind bewusst nicht umgesetzt (hoher Tauri/WebView-Aufwand).

## Performance-Test (24 Stunden)

```bash
cd tauri-app
npm run test:24h
```

## Demo-Daten

```bash
cd tauri-app
npm run seed-db -- --days 7
```

Datenbankpfad unter Windows: `%USERPROFILE%\Documents\frametrack-data\frametrack.db`
