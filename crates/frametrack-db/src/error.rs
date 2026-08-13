//! Datenbankfehler für SQLite und Dateizugriff.

use std::fmt::{Display, Formatter};

/// Fehler beim Zugriff auf die lokale SQLite Datenbank.
#[derive(Debug)]
pub enum DbError {
    Sql(rusqlite::Error),
    Io(std::io::Error),
    AppDirNotFound,
}

impl Display for DbError {
    // Formatiert den Fehler für Log und Anzeige.
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            DbError::Sql(e) => write!(f, "SQL Fehler: {}", e),
            DbError::Io(e) => write!(f, "I/O Fehler: {}", e),
            DbError::AppDirNotFound => write!(f, "Dokumente-Ordner nicht gefunden"),
        }
    }
}

impl std::error::Error for DbError {}

impl From<rusqlite::Error> for DbError {
    // Wandelt SQLite Fehler in den Crate Fehlertyp um.
    fn from(value: rusqlite::Error) -> Self {
        DbError::Sql(value)
    }
}

impl From<std::io::Error> for DbError {
    // Wandelt Dateisystemfehler in den Crate Fehlertyp um.
    fn from(value: std::io::Error) -> Self {
        DbError::Io(value)
    }
}
