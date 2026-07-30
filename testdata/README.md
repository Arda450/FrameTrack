# Demo-Datenbank (generiert)

Datei `frametrack-demo.db` wird mit erzeugt:

```bash
cargo run -p seed-database -- --days 3 --output testdata/frametrack-demo.db
```

In die App-DB kopieren (App vorher beenden):

```powershell
Copy-Item testdata\frametrack-demo.db $env:USERPROFILE\Documents\frametrack-data\frametrack.db -Force
```

Details: [../docs/TEST-DATENBANK.md](../docs/TEST-DATENBANK.md)
