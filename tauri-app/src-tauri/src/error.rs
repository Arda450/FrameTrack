//! Serialisierbare API Fehler für Tauri IPC Antworten.

use frametrack_db::DbError;
use frametrack_tracking::TrackingError;
use serde::Serialize;
use std::fmt::{Display, Formatter};

/// Fehlerantwort mit stabilem Code und lesbarer Meldung fürs Frontend.
#[derive(Debug, Serialize)]
pub struct ApiError {
    pub code: &'static str,
    pub message: String,
}

impl ApiError {
    /// Erzeugt einen neuen API Fehler mit Code und Meldung.
    pub fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

impl Display for ApiError {
    // Formatiert Code und Meldung für Logs.
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.code, self.message)?;
        Ok(())
    }
}

impl std::error::Error for ApiError {}

impl From<DbError> for ApiError {
    // Mappt Datenbankfehler auf IPC Fehlercodes.
    fn from(value: DbError) -> Self {
        match value {
            DbError::AppDirNotFound => {
                ApiError::new("APP_DIR_NOT_FOUND", "Dokumente-Ordner nicht gefunden")
            }
            DbError::Io(e) => ApiError::new("DB_IO_FAILED", e.to_string()),
            DbError::Sql(e) => ApiError::new("DB_SQL_FAILED", e.to_string()),
        }
    }
}

impl From<TrackingError> for ApiError {
    // Mappt Trackingfehler auf IPC Fehlercodes.
    fn from(value: TrackingError) -> Self {
        match value {
            TrackingError::WindowNotFound => {
                ApiError::new("WINDOW_NOT_FOUND", "Kein aktives Fenster gefunden")
            }
            TrackingError::EmptyTitle => {
                ApiError::new("WINDOW_TITLE_EMPTY", "Fenstertitel ist leer")
            }
            TrackingError::LockPoisoned(name) => {
                ApiError::new("LOCK_POISONED", format!("Lock vergiftet: {}", name))
            }
        }
    }
}
