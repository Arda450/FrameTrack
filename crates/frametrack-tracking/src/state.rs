//! Gemeinsamer Anwendungszustand für Tracking und Datenbankzugriff.

use rusqlite::Connection;
use std::sync::{
    atomic::{AtomicBool, AtomicU64},
    Arc, Mutex,
};

/// Geteilter Zustand für Tracking Thread, DB Verbindung und aktives Projekt.
pub struct TrackingState {
    pub is_running: Arc<AtomicBool>,
    pub session_id: Arc<AtomicU64>,
    pub db: Arc<Mutex<Connection>>,
    /// Aktives Projekt als ID und Anzeigename für Inserts und Events.
    pub active_project: Arc<Mutex<Option<(i64, String)>>>,
}

impl TrackingState {
    /// Erzeugt den Anwendungszustand mit geöffneter Datenbankverbindung.
    pub fn new(db: Connection) -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
            session_id: Arc::new(AtomicU64::new(0)),
            db: Arc::new(Mutex::new(db)),
            active_project: Arc::new(Mutex::new(None)),
        }
    }
}
