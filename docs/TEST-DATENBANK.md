# Test-Datenbank (Demo-Daten)

FrameTrack speichert die produktive Datenbank unter:

`%USERPROFILE%\Documents\frametracka-data\frametrack.db` (Windows)

Das CLI-Tool **`seed-database`** erzeugt **realistische** Demo-Daten:

- **2-Sekunden-Abstand** wie echtes Tracking
- **Arbeitsblöcke** mit Pausen (Nacht, Mittagspause)
- Drei Demo-Projekte: **frametrack**, **mpp-docs**, **nebenprojekt**
- Schwerpunkt auf Projekt **frametrack**

## Schnellstart (Tagesberichte)

```bash
cargo run -p seed-database -- --days 3
```

**Wichtig:** App beim Seed **beenden** (SQLite-Lock).

1. `npm run tauri dev` (in `tauri-app`)
2. Tab **Projekte** → **frametrack** aktivieren
3. Tab **Übersicht** → **Tagesbericht** → heute / gestern durchblättern

Mit `--days 3` liegen Daten auf **heute** (bis jetzt), **gestern** und **vorgestern** — ideal für KPIs, Pie, Zeitverlauf und Top-Kontexte.

## Rollierendes 24-Stunden-Fenster

Für Pie/Zeitverlauf (letzte 24 h ab jetzt):

```bash
cargo run -p seed-database
# oder
cargo run -p seed-database -- --hours 24
```

## Optionen

| Option                                 | Bedeutung                                        |
| -------------------------------------- | ------------------------------------------------ |
| `--days 3`                             | **3 Kalendertage** (empfohlen für Tagesberichte) |
| `--hours 12`                           | Rollierendes Fenster (Stunden)                   |
| `--no-clear`                           | Daten nicht vorher löschen                       |
| `--output testdata/frametrack-demo.db` | Andere Zieldatei                                 |

```bash
cargo run -p seed-database -- --days 7 --output testdata/frametrack-week.db
```

Kopie in die App-DB:

```powershell
Copy-Item testdata\frametrack-week.db $env:USERPROFILE\Documents\frametrack-data\frametrack.db -Force
```

## Demo-Inhalt pro Tag (ca.)

| Uhrzeit (lokal) | Projekt      | Fenster (Auszug)          |
| --------------- | ------------ | ------------------------- |
| 07:00–11:30     | frametrack   | VS Code, Terminal, GitHub |
| 12:30–17:00     | frametrack   | VS Code, DailyReportView  |
| 18:00–19:00     | mpp-docs     | MPP-PDF, Notion           |
| 19:30–20:25     | nebenprojekt | YouTube, Discord, …       |
| 20:30–22:00     | frametrack   | Abendsession              |

## Zeitverlauf: Bucket-Grösse

Die UI skaliert die **Bucket-Grösse** automatisch (`chooseBucketSeconds`):

| Sichtbarer Zeitraum | Bucket |
| ------------------- | ------ |
| bis 45 min          | 1 min  |
| bis 3 h             | 2 min  |
| bis 8 h             | 5 min  |
| 24 h                | 15 min |

Tagesbericht nutzt fest **15-Minuten-Buckets** für den ganzen Kalendertag.
