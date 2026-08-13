//! Datenbankpfade, Schema Migration und Verbindungsaufbau.

use std::path::{Path, PathBuf};

use crate::DbError;
use rusqlite::Connection;

/// Pfad zur produktiven SQLite-Datei (`Dokumente/frametrack-data/frametrack.db`).
pub fn default_database_path() -> Result<PathBuf, DbError> {
    let app_dir = dirs::document_dir()
        .ok_or(DbError::AppDirNotFound)?
        .join("frametrack-data");
    Ok(app_dir.join("frametrack.db"))
}

/// Standardordner für Exporte (`Dokumente/frametrack-exports`).
///
/// Nur Pfadvorschlag für den Speicherndialog – der Ordner wird nicht vorab angelegt.
pub fn default_export_directory() -> Result<PathBuf, DbError> {
    let export_dir = dirs::document_dir()
        .ok_or(DbError::AppDirNotFound)?
        .join("frametrack-exports");
    Ok(export_dir)
}

/// Öffnet die Standard SQLite Datei im Dokumente Ordner.
pub fn init_database() -> Result<Connection, DbError> {
    open_database(&default_database_path()?)
}

/// Öffnet oder erstellt eine SQLite-Datei am angegebenen Pfad und wendet das Schema an.
pub fn open_database(path: &Path) -> Result<Connection, DbError> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let conn = Connection::open(path)?;
    apply_schema(&conn)?;
    Ok(conn)
}

/// In-Memory-Datenbank für Tests und lokale Experimente.
pub fn init_in_memory_database() -> Result<Connection, DbError> {
    let conn = Connection::open_in_memory()?;
    apply_schema(&conn)?;
    Ok(conn)
}

/// Erstellt Tabellen, Indizes und führt Spaltenmigrationen aus.
fn apply_schema(conn: &Connection) -> Result<(), DbError> {
    conn.execute("PRAGMA foreign_keys = ON", [])?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            path TEXT NOT NULL UNIQUE,
            created_at INTEGER NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            window_title TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            project_id INTEGER REFERENCES projects(id),
            duration_seconds INTEGER NOT NULL DEFAULT 2,
            activity_type TEXT,
            context_key TEXT
        )",
        [],
    )?;

    let has_duration = {
        let mut stmt = conn.prepare("PRAGMA table_info(activities)")?;
        let columns = stmt
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<Result<Vec<_>, _>>()?;
        columns.iter().any(|name| name == "duration_seconds")
    };
    if !has_duration {
        conn.execute(
            "ALTER TABLE activities
             ADD COLUMN duration_seconds INTEGER NOT NULL DEFAULT 2",
            [],
        )?;
    }

    let has_activity_type = {
        let mut stmt = conn.prepare("PRAGMA table_info(activities)")?;
        let columns = stmt
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<Result<Vec<_>, _>>()?;
        columns.iter().any(|name| name == "activity_type")
    };
    if !has_activity_type {
        conn.execute("ALTER TABLE activities ADD COLUMN activity_type TEXT", [])?;
    }

    let has_context_key = {
        let mut stmt = conn.prepare("PRAGMA table_info(activities)")?;
        let columns = stmt
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<Result<Vec<_>, _>>()?;
        columns.iter().any(|name| name == "context_key")
    };
    if !has_context_key {
        conn.execute("ALTER TABLE activities ADD COLUMN context_key TEXT", [])?;
    }

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id)",
        [],
    )?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::apply_schema;
    use rusqlite::Connection;

    /// Liest Spaltennamen der Tabelle `activities` für Migrationstests.
    fn activity_columns(conn: &Connection) -> Vec<String> {
        let mut stmt = conn.prepare("PRAGMA table_info(activities)").unwrap();
        stmt.query_map([], |row| row.get::<_, String>(1))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap()
    }

    /// Prüft, dass abgeleitete Spalten migriert werden, URLs aber nicht persistiert.
    #[test]
    fn migration_adds_derived_type_but_no_url_column() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute(
            "CREATE TABLE activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                window_title TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                project_id INTEGER
            )",
            [],
        )
        .unwrap();

        apply_schema(&conn).unwrap();
        let columns = activity_columns(&conn);

        assert!(columns.iter().any(|column| column == "activity_type"));
        assert!(columns.iter().any(|column| column == "context_key"));
        assert!(columns.iter().any(|column| column == "duration_seconds"));
        assert!(!columns.iter().any(|column| column.contains("url")));
    }
}
