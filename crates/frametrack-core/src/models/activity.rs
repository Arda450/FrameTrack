//! Fensteraktivität als Kernmodell für Tracking und Persistenz.

use crate::ActivityType;
use serde::Serialize;

/// Eine erfasste Fensteraktivität mit abgeleiteten Metadaten.
#[derive(Clone, Serialize)]
pub struct WindowActivity {
    pub title: String,
    /// Unix Zeitstempel in Sekunden.
    pub timestamp: u64,
    /// Beim Sampling abgeleitete Klasse; enthält niemals die Browser URL.
    pub activity_type: ActivityType,
    /// Stabiler Kontext für Charts, ohne URL zu persistieren.
    pub context_key: String,
}
