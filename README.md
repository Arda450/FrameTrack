# FrameTrack

Windows-Desktop-Anwendung zur lokalen, projektbezogenen Erfassung aktiver Fenster (Tauri 2, Rust, React, SQLite).

## Nutzeranleitung

### Voraussetzungen

- Windows 10 oder 11
- Microsoft Edge WebView2 (unter Windows 11 in der Regel bereits vorhanden)

### Installation

**Vorgebaute Abgabeversion** (für Nutzung und Bewertung empfohlen):

Im Ordner `Medienprodukt` den Windows-Installer ausführen oder die bereitgestellte Programmdatei direkt starten. Dafür werden weder Node.js noch npm, Rust oder ein Ordner `node_modules` benötigt. Diese Werkzeuge sind nur für Entwicklung und das Bauen aus dem Quellcode erforderlich.

**Aus dem Quellcode bauen** (nur nötig, wenn man selbst kompilieren will):

Dafür reichen `npm install` und `npm run build` **nicht**. `npm run build` erzeugt nur das Frontend. Die Windows-Desktop-App entsteht erst mit dem Tauri-Build und benötigt zusätzlich:

- Node.js und npm
- eine aktuelle Rust-Toolchain (`rustc` / `cargo`)
- die unter Windows für Tauri erforderlichen Build-Werkzeuge (unter anderem Visual Studio Build Tools mit C++-Workload)

```bash
cd tauri-app
npm install
npm run tauri build
```

`npm install` lädt die Frontend-Abhängigkeiten und erstellt den Ordner `node_modules` automatisch. Der Ordner `target/` entsteht beim Build von selbst.

Da FrameTrack als Cargo-Workspace aufgebaut ist, liegt der Release-Build lokal im Projektstamm unter `target/release/` (ausführbare Datei) beziehungsweise unter `target/release/bundle/` (Installer). Der Ordner `target/` ist nur Build-Ausgabe und wird nicht mitabgegeben. Für die Abgabe die benötigten Dateien (Installer bzw. Programmdatei) nach `Medienprodukt` kopieren.

**Entwicklungsmodus** (mit Hot Reload):

```bash
cd tauri-app
npm install
npm run tauri dev
```

### Erste Schritte

1. FrameTrack starten.
2. In der Seitenleiste auf **Neues Projekt** klicken und einen Projektnamen eingeben.
3. Ein Projekt in der Liste anklicken – damit wird es aktiv und das Tracking startet.
4. Die **Auswertung** im Hauptfenster zeigt Zeitstatistik, Berichte und erfasste Fenster für das aktive Projekt.

Tracking läuft nur, solange ein Projekt aktiv ist. Ein erneuter Klick auf dasselbe Projekt stoppt das Tracking.

### Bedienung

**Seitenleiste**

- **App-Übersicht:** KPIs und Diagramme über alle Projekte (letzte 24 Stunden).
- **Einstellungen:** Erscheinungsbild, optionale Windows-Benachrichtigungen, Daten löschen.
- **Projektliste:** Projekt wählen (Tracking starten/stoppen), umbenennen oder löschen.

**Auswertung** (Hauptfenster, nur mit aktivem Projekt)

- **Zeitstatistik:** Zeitverteilung und Zeitverlauf der letzten 24 Stunden; Tabelle «Erfasste Fenster» mit Filter und CSV-Export.
- **Tagesbericht:** Kennzahlen, Diagramme und Export (JSON, CSV, PDF) für einen wählbaren Tag.
- **Wochenbericht:** Aggregation Montag bis Sonntag inkl. Tagesübersicht; gleicher Export wie beim Tagesbericht.

Berichte und PDF-Export können auf das aktive Projekt, alle Projekte oder eine frei gewählte Mehrfachauswahl beschränkt werden.

**Export**

- CSV der erfassten Fenster (Zeitstatistik, gefiltert nach Tabellenansicht).
- JSON und CSV/PDF über das Export-Menü in Tages- und Wochenberichten.
- Beim Speichern öffnet sich der Windows-Speicherdialog; Erfolg und Fehler erscheinen als Toast unten rechts.

**Einstellungen**

- Hell/Dunkel-Theme umschalten.
- Optionale Tracking-Benachrichtigungen (Intervall 1, 2 oder 4 Stunden).
- Alle Aktivitäten oder alle Daten (Projekte inklusive) löschen – jeweils mit Bestätigungsdialog.

### Daten und Datenschutz

Alle Tracking-Daten werden ausschliesslich lokal in SQLite gespeichert. Es gibt keine Cloud-Synchronisation und keine Telemetrie.

**Datenbankpfad unter Windows:**

`%USERPROFILE%\Documents\frametrack-data\frametrack.db`

Fenstertitel können personenbezogene oder vertrauliche Inhalte enthalten. Exporte und die Datenbankdatei sollten entsprechend behandelt werden.

### Demo-Daten

Der FrameTrack-Build enthält keine Demo-Daten. Für die Bewertung kann das Abgabepaket stattdessen einen vorgebauten Demo-Daten-Generator enthalten. Dieser erzeugt sieben aktuelle Kalendertage mit künstlichen Projekten und Aktivitäten. Damit können Zeitstatistik, Tages- und Wochenberichte, Diagramme, Filter und Exporte ohne längere eigene Aufzeichnung geprüft werden. Die Daten enthalten keine persönlichen Fenstertitel oder Tracking-Informationen.

Installer und portable Programmdatei lesen dieselbe Datenbank unter `%USERPROFILE%\Documents\frametrack-data\frametrack.db`. Die Demo-Daten werden **nicht** in die App-EXE eingebaut, sondern separat in diese Datei geschrieben.

**Reihenfolge:** Zuerst Demo-Daten erzeugen, danach FrameTrack starten. Die App muss dafür **nicht** vorher geöffnet werden. Sie darf während des Seeds nur nicht laufen, weil SQLite die Datenbank sonst sperren kann. Falls FrameTrack bereits offen ist, zuerst vollständig beenden.

**Empfohlen für die vorgebaute Abgabeversion:**

Im Abgabepaket liegen `seed-database.exe` und `Demo-Daten laden.cmd` im selben Ordner (zum Beispiel `Medienprodukt/Testdaten`). Weder npm noch Rust/Cargo werden dafür benötigt.

1. FrameTrack schliessen, falls es läuft.
2. `Demo-Daten laden.cmd` doppelklicken (kein bestimmtes Terminal-Verzeichnis nötig).
3. FrameTrack starten (Installer oder portable EXE) und eines der Demo-Projekte auswählen.

Die Seed-EXE wird einmalig im Projektstamm gebaut:

```bash
cargo build --release -p seed-database
```

Danach nur `target/release/seed-database.exe` zusammen mit `Demo-Daten laden.cmd` in den Abgabeordner kopieren. Der Ordner `target/` selbst gehört nicht zur Abgabe. Inhalt der CMD-Datei:

```bat
@echo off
echo FrameTrack muss vor dem Laden der Demodaten geschlossen sein.
echo.
"%~dp0seed-database.exe" --days 7
set "SEED_EXIT=%ERRORLEVEL%"
echo.
if not "%SEED_EXIT%"=="0" (
  echo Demodaten konnten nicht erzeugt werden.
) else (
  echo Demodaten wurden erfolgreich erzeugt.
)
pause
```

`"%~dp0seed-database.exe"` startet die EXE im selben Ordner wie die CMD-Datei. Der Generator ermittelt selbst den Windows-Dokumente-Ordner und schreibt nach `frametrack-data\frametrack.db`. Eine dort bereits vorhandene Datenbank wird standardmässig ersetzt und sollte bei Bedarf vorher gesichert werden. Über **Einstellungen → Alle Daten löschen** können die Demodaten wieder entfernt werden.

**Fallback, falls die CMD-Datei nicht funktioniert:**

Windows kann heruntergeladene EXE-Dateien blockieren. Dann in den Eigenschaften von `seed-database.exe` unter **Zulassen** / **Unblock** prüfen. FrameTrack muss weiterhin geschlossen sein.

Anschliessend PowerShell oder die Eingabeaufforderung öffnen und **in den Ordner wechseln, in dem `seed-database.exe` liegt** – also in denselben Ordner wie `Demo-Daten laden.cmd`, zum Beispiel:

```powershell
cd "C:\Pfad\zum\Abgabepaket\Medienprodukt\Testdaten"
```

Der genaue Pfad hängt davon ab, wohin das Abgabepaket entpackt wurde. Kontrolle: Im Ordner müssen `seed-database.exe` und `Demo-Daten laden.cmd` sichtbar sein (`dir` bzw. `ls`). Dann:

```powershell
.\seed-database.exe --days 7
```

In der klassischen Eingabeaufforderung (CMD) statt PowerShell:

```bat
cd /d "C:\Pfad\zum\Abgabepaket\Medienprodukt\Testdaten"
seed-database.exe --days 7
```

Es muss **nicht** ins FrameTrack-Quellcode-Verzeichnis gewechselt werden und auch nicht in den Installationsordner der App. Nach erfolgreicher Meldung FrameTrack starten. Die Daten liegen unter `%USERPROFILE%\Documents\frametrack-data\frametrack.db`.

**Alternative beim Start aus dem Quellcode** (nicht für die vorgebaute Abgabeversion):

```bash
cd tauri-app
npm run seed-db -- --days 7
```

Auch dafür muss FrameTrack vorher beendet werden. Der Befehl benötigt npm sowie Rust/Cargo, wird im Ordner `tauri-app` des Repositories ausgeführt und ersetzt dieselbe lokale FrameTrack-Datenbank.

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

**Abdeckung (Stand August 2026):** 40 automatisierte Tests. Kontextbildung, Dwell-Aggregation, Schema-Migration, Minuten-Aggregation, SQLite-Integration einschliesslich Mehrprojektfilter sowie JSON-Export. UI- und Ende-zu-Ende-Tests sind bewusst nicht umgesetzt (hoher Tauri/WebView-Aufwand).

## Performance-Test (24 Stunden)

```bash
cd tauri-app
npm run test:24h
```

Der Test startet FrameTrack im Release-Build, misst im 60-Sekunden-Takt Prozess-RAM und CPU und protokolliert das Ergebnis. Details siehe `tools/perf/`.
