//! Bericht Commands für Tages, Wochen und Projekt Lazy Load.

mod period;

use tauri::State;

use crate::dto::stats::{DailyReportDto, DwellSegmentDto, WeeklyReportDto};
use crate::error::ApiError;
use frametrack_db::{
    filter_activities_by_project_ids, get_activities_filtered, list_projects, ActivitiesFilter,
    ActivityWithProject, DbProject,
};
use frametrack_tracking::TrackingState;
use period::{
    build_period_report_core, compute_by_day, compute_by_project_for_range, day_end_exclusive,
    day_start_from_ts, DwellParams, PeriodBuildParams, SECONDS_PER_DAY,
};

/// Lädt gefilterte Aktivitäten für einen Mehrprojekt Berichtsumfang.
fn load_rows_for_project_scope(
    conn: &rusqlite::Connection,
    project_ids: &[i64],
    from_ts: u64,
    to_ts: u64,
) -> Result<Vec<ActivityWithProject>, ApiError> {
    let rows = get_activities_filtered(
        conn,
        &ActivitiesFilter {
            project_id: None,
            from_ts: Some(from_ts),
            to_ts: Some(to_ts),
            context_query: None,
        },
    )
    .map_err(ApiError::from)?;

    Ok(filter_activities_by_project_ids(rows, Some(project_ids)))
}

/// Bildet einen Anzeigenamen für die gewählte Projektliste.
fn project_scope_name(project_ids: &[i64], projects: &[DbProject]) -> Option<String> {
    let selected_names: Vec<&str> = projects
        .iter()
        .filter(|project| project_ids.contains(&project.id))
        .map(|project| project.name.as_str())
        .collect();

    match selected_names.as_slice() {
        [] => None,
        [name] => Some((*name).to_string()),
        names if names.len() == projects.len() => Some("Alle Projekte".to_string()),
        names => Some(names.join(", ")),
    }
}

/// Liefert einen aggregierten Tagesbericht für den gewählten Projektumfang.
#[tauri::command]
pub fn get_daily_report(
    state: State<TrackingState>,
    project_ids: Vec<i64>,
    date: String,
    from_ts: u64,
    to_ts: u64,
    max_segment_gap_seconds: Option<u64>,
    tail_seconds: Option<u64>,
) -> Result<DailyReportDto, ApiError> {
    let dwell = DwellParams::from_options(max_segment_gap_seconds, tail_seconds);
    let db_conn = state
        .db
        .lock()
        .map_err(|_| ApiError::new("DB_LOCK_FAILED", "Datenbank-Lock fehlgeschlagen"))?;

    let rows = load_rows_for_project_scope(&db_conn, &project_ids, from_ts, to_ts)?;

    let range_start = from_ts;
    let range_end_exclusive = day_end_exclusive(from_ts);

    let mut core = build_period_report_core(
        &rows,
        &PeriodBuildParams {
            range_start,
            range_end_exclusive,
            timeline_bucket_seconds: 900,
            dwell,
        },
    );
    let projects = list_projects(&db_conn).map_err(ApiError::from)?;
    core.project_name = project_scope_name(&project_ids, &projects);

    // Zeit pro Projekt wird lazy über get_by_project_for_range geladen.
    let by_project_day = Vec::new();

    Ok(DailyReportDto {
        date,
        project_name: core.project_name,
        total_active_seconds: core.total_active_seconds,
        context_count: core.context_count,
        first_activity_ts: core.first_activity_ts,
        last_activity_ts: core.last_activity_ts,
        by_category: core.by_category,
        by_activity_type: core.by_activity_type,
        by_project_day,
        timeline: core.timeline,
    })
}

/// Liefert einen aggregierten Wochenbericht für den gewählten Projektumfang.
///
/// Die flachen Parameter bilden bewusst den bestehenden IPC Vertrag ab.
#[allow(clippy::too_many_arguments)]
#[tauri::command]
pub fn get_weekly_report(
    state: State<TrackingState>,
    project_ids: Vec<i64>,
    week_start: String,
    week_end: String,
    from_ts: u64,
    to_ts: u64,
    max_segment_gap_seconds: Option<u64>,
    tail_seconds: Option<u64>,
) -> Result<WeeklyReportDto, ApiError> {
    let dwell = DwellParams::from_options(max_segment_gap_seconds, tail_seconds);
    let db_conn = state
        .db
        .lock()
        .map_err(|_| ApiError::new("DB_LOCK_FAILED", "Datenbank-Lock fehlgeschlagen"))?;

    let rows = load_rows_for_project_scope(&db_conn, &project_ids, from_ts, to_ts)?;

    let range_start = from_ts;
    let range_end_exclusive = day_end_exclusive(day_start_from_ts(to_ts));

    let mut core = build_period_report_core(
        &rows,
        &PeriodBuildParams {
            range_start,
            range_end_exclusive,
            timeline_bucket_seconds: SECONDS_PER_DAY,
            dwell,
        },
    );
    let projects = list_projects(&db_conn).map_err(ApiError::from)?;
    core.project_name = project_scope_name(&project_ids, &projects);

    let mut day_starts = Vec::new();
    let mut cursor = range_start;
    while cursor < range_end_exclusive {
        day_starts.push(cursor);
        cursor = cursor.saturating_add(SECONDS_PER_DAY);
    }
    let by_day = compute_by_day(&rows, &day_starts, dwell);

    // Zeit pro Projekt wird lazy über get_by_project_for_range geladen.
    let by_project_week = Vec::new();

    let active_days = by_day.iter().filter(|day| day.value > 0).count() as i64;

    Ok(WeeklyReportDto {
        week_start,
        week_end,
        project_name: core.project_name,
        total_active_seconds: core.total_active_seconds,
        context_count: core.context_count,
        active_days,
        first_activity_ts: core.first_activity_ts,
        last_activity_ts: core.last_activity_ts,
        by_category: core.by_category,
        by_activity_type: core.by_activity_type,
        by_day,
        by_project_week,
        timeline: core.timeline,
    })
}

/// Lädt Projekt Verweildauer für einen Zeitraum als separater Lazy Endpoint.
#[tauri::command]
pub fn get_by_project_for_range(
    state: State<TrackingState>,
    from_ts: u64,
    to_ts: u64,
    project_ids: Option<Vec<i64>>,
    max_segment_gap_seconds: Option<u64>,
    tail_seconds: Option<u64>,
) -> Result<Vec<DwellSegmentDto>, ApiError> {
    let dwell = DwellParams::from_options(max_segment_gap_seconds, tail_seconds);
    let db_conn = state
        .db
        .lock()
        .map_err(|_| ApiError::new("DB_LOCK_FAILED", "Datenbank-Lock fehlgeschlagen"))?;

    let filter = ActivitiesFilter {
        project_id: None,
        from_ts: Some(from_ts),
        to_ts: Some(to_ts),
        context_query: None,
    };
    let all_rows = get_activities_filtered(&db_conn, &filter).map_err(ApiError::from)?;
    let scoped_rows = filter_activities_by_project_ids(all_rows, project_ids.as_deref());

    let range_start = from_ts;
    let range_end_exclusive = day_end_exclusive(day_start_from_ts(to_ts));

    Ok(compute_by_project_for_range(
        &scoped_rows,
        range_start,
        range_end_exclusive,
        dwell,
    ))
}
