//! Fehlertypen für Fenstererfassung und interne Locks.

use std::fmt::{Display, Formatter};

/// Fehler beim Lesen des aktiven Fensters oder bei Lock Problemen.
#[derive(Debug)]
pub enum TrackingError {
    WindowNotFound,
    EmptyTitle,
    LockPoisoned(&'static str),
}

impl Display for TrackingError {
    // Formatiert den Fehler für Log und Anzeige.
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            TrackingError::WindowNotFound => write!(f, "Kein aktives Fenster gefunden"),
            TrackingError::EmptyTitle => write!(f, "Fenstertitel ist leer"),
            TrackingError::LockPoisoned(name) => write!(f, "Lock vergiftet: {}", name),
        }
    }
}

impl std::error::Error for TrackingError {}
