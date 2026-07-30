//! DTO für ein Nutzerprojekt (Ordner-basierte Projektwahl).

use serde::Serialize;

/// Projekt, wie es in der UI (Picker, Liste, aktives Projekt) angezeigt wird.
#[derive(Serialize)]
pub struct ProjectDto {
    pub id: i64,
    pub name: String,
    /// Dateisystem-Pfad; bei `get_active_project` ggf. leer
    pub path: String,
}

/// Kennzahlen eines Projekts für die Zeitstatistik-Seitenleiste.
#[derive(Serialize)]
pub struct ProjectStatsDto {
    pub project_id: i64,
    pub name: String,
    pub created_at: u64,
    pub activity_count: i64,
    pub total_active_seconds: u64,
    pub today_active_seconds: u64,
    pub recent_active_seconds: u64,
    pub active_days: i64,
    pub first_activity_ts: Option<u64>,
    pub last_activity_ts: Option<u64>,
}
