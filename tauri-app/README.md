# FrameTrack Desktop Anwendung

Dieser Ordner enthält das React Frontend und die Tauri Anwendung von FrameTrack.

## Entwicklung

Die Befehle werden in diesem Ordner ausgeführt:

```bash
npm install
npm run tauri dev
```

## Qualitätsprüfungen

```bash
npm run check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace
```

## Demo Daten

```bash
npm run seed-db -- --days 7
```

Die produktive Datenbank liegt unter Windows in
`%USERPROFILE%\Documents\frametrack-data\frametrack.db`.
