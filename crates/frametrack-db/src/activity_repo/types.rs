//! Gemeinsame Typen für Aktivitätsabfragen und Statistiken.

use frametrack_core::{category_key_from_title, classify_activity_type, ActivityType};

/// Eine Aktivität inkl. optionaler Projekt Zuordnung.
///
/// Entspricht einem JOIN aus `activities` und `projects`:
/// `title` stammt aus `activities.window_title`, `timestamp` aus Unix Sekunden,
/// `project_id` und `project_name` aus `INNER JOIN` mit `projects` (jede gespeicherte Aktivität hat ein Projekt).
#[derive(Debug, Clone)]
pub struct ActivityWithProject {
    pub title: String,
    pub timestamp: u64,
    pub project_id: Option<i64>,
    pub project_name: Option<String>,
    pub duration_seconds: u64,
    /// Beim Sampling abgeleitete Klasse; bei älteren DB Zeilen nicht vorhanden.
    pub activity_type: Option<ActivityType>,
    /// Beim Sampling abgeleiteter Kontextschlüssel; bei Alt-Daten `None`.
    pub context_key: Option<String>,
}

impl ActivityWithProject {
    /// Nutzt für alte Daten weiterhin die titelbasierte Klassifikation.
    pub fn effective_activity_type(&self) -> ActivityType {
        self.activity_type
            .unwrap_or_else(|| classify_activity_type(&self.title))
    }

    /// Kontext für Charts: gespeicherter Schlüssel oder Titel Heuristik.
    pub fn effective_category_key(&self) -> String {
        self.context_key
            .clone()
            .unwrap_or_else(|| category_key_from_title(&self.title))
    }
}

/// Appweite Kennzahlen für die Übersichtsansicht.
#[derive(Debug, Clone)]
pub struct ActivityOverviewSummary {
    pub activity_count: i64,
    pub total_active_seconds: u64,
    pub today_active_seconds: u64,
    pub active_days: i64,
    pub first_activity_ts: Option<u64>,
}

/// Gesamtzeit je Projektname für Diagramme.
#[derive(Debug, Clone)]
pub struct ProjectActivityTotal {
    pub name: String,
    pub active_seconds: u64,
}

/// Kennzahlen für ein einzelnes Projekt in der Zeitstatistik.
#[derive(Debug, Clone)]
pub struct ProjectStatsSummary {
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

/// Filterkriterien für die paginierte Aktivitätstabelle.
///
/// Alle Felder sind optional: `None` bedeutet kein Filter auf dieses Kriterium.
#[derive(Debug, Clone, Default)]
pub struct ActivitiesFilter {
    /// Nur Aktivitäten dieses Projekts; `None` bedeutet alle Projekte.
    pub project_id: Option<i64>,
    /// Untere Grenze in Unix Sekunden, inklusiv.
    pub from_ts: Option<u64>,
    /// Obere Grenze in Unix Sekunden, inklusiv.
    pub to_ts: Option<u64>,
    /// Textsuche im Roh Fenstertitel; leer oder `None` bedeutet keine Suche.
    pub context_query: Option<String>,
}

/// Ergebnis einer paginierten Abfrage für die Aktivitätstabelle.
#[derive(Debug, Clone)]
pub struct ActivitiesPage {
    /// Einträge dieser Seite, typisch maximal 20.
    pub items: Vec<ActivityWithProject>,
    /// Gesamtanzahl passender Einträge nach Filter für Paginierung.
    pub total_count: i64,
}
