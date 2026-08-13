//! Exportauftrag, Datenladen und Hilfsfunktionen für IPC Parameter.

use std::path::PathBuf;

use tauri::State;

use crate::commands::aggregation::DwellSegmentParams;
use crate::dto::export::ExportActivity;
use crate::error::ApiError;
use frametrack_core::format_context_label_from_title;
use frametrack_db::{
    filter_activities_by_project_ids, get_activities_filtered, ActivitiesFilter,
    ActivityWithProject,
};
use frametrack_tracking::TrackingState;

const DWELL_GAP_SECS: u64 = 120;
// Gleich wie Tages und Wochenberichte: ein Minutenaggregat zählt
// höchstens bis zum Ende seiner erfassten Minute.
const DWELL_TAIL_SECS: u64 = 60;

/// Interner Exportauftrag mit Filter und optionaler Mehrprojektauswahl.
#[derive(Debug, Clone)]
pub(crate) struct ExportRequest {
    pub filter: ActivitiesFilter,
    pub project_ids: Option<Vec<i64>>,
}

impl ExportRequest {
    /// Baut einen Exportauftrag aus flachen IPC Parametern.
    pub(crate) fn from_params(
        project_id: Option<i64>,
        project_ids: Option<Vec<i64>>,
        from_ts: Option<u64>,
        to_ts: Option<u64>,
        context_query: Option<String>,
    ) -> Self {
        Self {
            filter: ActivitiesFilter {
                project_id,
                from_ts,
                to_ts,
                context_query,
            },
            project_ids,
        }
    }
}

/// Baut einen Exportauftrag aus flachen IPC Parametern.
pub(crate) fn export_params(
    project_id: Option<i64>,
    project_ids: Option<Vec<i64>>,
    from_ts: Option<u64>,
    to_ts: Option<u64>,
    context_query: Option<String>,
) -> ExportRequest {
    ExportRequest::from_params(project_id, project_ids, from_ts, to_ts, context_query)
}

/// Mappt eine DB Zeile auf das Export JSON Format.
pub(crate) fn to_export_activity(a: ActivityWithProject) -> ExportActivity {
    let context_label = format_context_label_from_title(&a.title);
    let activity_type = a.effective_activity_type().label().to_string();

    ExportActivity {
        title: a.title,
        context_label,
        activity_type,
        timestamp: a.timestamp,
        project_id: a.project_id,
        project_name: a.project_name,
    }
}

/// Baut Dwell Parameter aus dem Exportfilter mit export spezifischen Sekundenwerten.
pub(crate) fn dwell_params_from_filter(filter: &ActivitiesFilter) -> DwellSegmentParams {
    DwellSegmentParams {
        max_segment_gap_seconds: DWELL_GAP_SECS,
        tail_seconds: DWELL_TAIL_SECS,
        from_ts: filter.from_ts,
        to_ts: filter.to_ts,
    }
}

/// Lädt gefilterte Aktivitäten inklusive Mehrprojektfilter aus der Datenbank.
pub(crate) fn load_filtered_activities(
    state: &State<TrackingState>,
    req: &ExportRequest,
) -> Result<Vec<ActivityWithProject>, ApiError> {
    let db_conn = state
        .db
        .lock()
        .map_err(|_| ApiError::new("DB_LOCK_FAILED", "Datenbank-Lock fehlgeschlagen"))?;
    let rows = get_activities_filtered(&db_conn, &req.filter).map_err(ApiError::from)?;
    Ok(filter_activities_by_project_ids(
        rows,
        req.project_ids.as_deref(),
    ))
}

/// Validiert und normalisiert einen Zielpfad für Dateiexporte.
pub(crate) fn parse_target_path(path: &str) -> Result<PathBuf, ApiError> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err(ApiError::new(
            "EXPORT_EMPTY_PATH",
            "Kein Speicherpfad angegeben.",
        ));
    }
    Ok(PathBuf::from(trimmed))
}
