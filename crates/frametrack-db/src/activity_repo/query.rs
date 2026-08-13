//! Gefilterte Leseabfragen für die Aktivitätstabelle und Exporte.

use crate::DbError;
use frametrack_core::ActivityType;
use rusqlite::Connection;

use super::types::{ActivitiesFilter, ActivitiesPage, ActivityWithProject};

/// SQL WHERE Klausel für Tabellenfilter mit optionalen Parametern.
///
/// SQLite behandelt NULL als Bedingung ignorieren (`? IS NULL OR ...`).
pub(crate) const FILTER_WHERE: &str = "
WHERE (?1 IS NULL OR a.project_id = ?1)
  AND (?2 IS NULL OR a.timestamp >= ?2)
  AND (?3 IS NULL OR a.timestamp <= ?3)
  AND (?4 IS NULL OR a.window_title LIKE '%' || ?4 || '%')";

/// Wandelt eine SQLite Zeile in `ActivityWithProject` um.
pub(crate) fn map_activity_row(
    row: &rusqlite::Row<'_>,
) -> Result<ActivityWithProject, rusqlite::Error> {
    let ts: i64 = row.get(1)?;
    let activity_type_key: Option<String> = row.get(5)?;
    Ok(ActivityWithProject {
        title: row.get(0)?,
        timestamp: ts as u64,
        project_id: row.get(2)?,
        project_name: row.get(3)?,
        duration_seconds: row.get::<_, i64>(4)?.max(0) as u64,
        activity_type: activity_type_key
            .as_deref()
            .and_then(ActivityType::from_key),
        context_key: row.get(6)?,
    })
}

/// Normalisiert den Kontext Suchstring durch Trimmen; leer wird zu `None`.
pub(crate) fn normalized_context_query(query: Option<String>) -> Option<String> {
    query.and_then(|q| {
        let trimmed = q.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

/// Übersetzt UI Sortierfelder in eine sichere ORDER BY Klausel.
pub(crate) fn order_clause(sort_by: &str, sort_order: &str) -> &'static str {
    let asc = matches!(sort_order.to_ascii_lowercase().as_str(), "asc");
    match sort_by {
        "context" | "title" => {
            if asc {
                "ORDER BY a.window_title ASC"
            } else {
                "ORDER BY a.window_title DESC"
            }
        }
        "project" => {
            if asc {
                "ORDER BY p.name ASC"
            } else {
                "ORDER BY p.name DESC"
            }
        }
        "timestamp" | "date" | "time" => {
            if asc {
                "ORDER BY a.timestamp ASC"
            } else {
                "ORDER BY a.timestamp DESC"
            }
        }
        _ => "ORDER BY a.timestamp DESC",
    }
}

/// Lädt eine Seite Aktivitäten für die UI Tabelle mit Paginierung und Filter.
pub fn get_activities_page(
    conn: &Connection,
    filter: &ActivitiesFilter,
    page: u32,
    page_size: u32,
    sort_by: String,
    sort_order: String,
) -> Result<ActivitiesPage, DbError> {
    let order = order_clause(&sort_by, &sort_order);
    let page_size = page_size.clamp(1, 100) as i64;
    let offset = (page as i64).saturating_mul(page_size);

    let pid = filter.project_id;
    let from_ts: Option<i64> = filter.from_ts.map(|t| t as i64);
    let to_ts: Option<i64> = filter.to_ts.map(|t| t as i64);
    let context = normalized_context_query(filter.context_query.clone());

    let count_sql = format!("SELECT COUNT(*) FROM activities a {FILTER_WHERE}");
    let total: i64 = conn.query_row(
        &count_sql,
        (pid, from_ts, to_ts, context.as_deref()),
        |row| row.get(0),
    )?;

    let select_sql = format!(
        "SELECT a.window_title, a.timestamp, a.project_id, p.name, a.duration_seconds,
                a.activity_type, a.context_key
         FROM activities a
         INNER JOIN projects p ON a.project_id = p.id
         {FILTER_WHERE}
         {order}
         LIMIT ?5 OFFSET ?6"
    );

    let mut stmt = conn.prepare(&select_sql)?;
    let rows = stmt
        .query_map(
            (pid, from_ts, to_ts, context.as_deref(), page_size, offset),
            map_activity_row,
        )?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(ActivitiesPage {
        items: rows,
        total_count: total,
    })
}

/// Lädt alle passenden Aktivitäten, älteste zuerst, für Export und Aggregation.
pub fn get_activities_filtered(
    conn: &Connection,
    filter: &ActivitiesFilter,
) -> Result<Vec<ActivityWithProject>, DbError> {
    let pid = filter.project_id;
    let from_ts: Option<i64> = filter.from_ts.map(|t| t as i64);
    let to_ts: Option<i64> = filter.to_ts.map(|t| t as i64);
    let context = normalized_context_query(filter.context_query.clone());

    let select_sql = format!(
        "SELECT a.window_title, a.timestamp, a.project_id, p.name, a.duration_seconds,
                a.activity_type, a.context_key
         FROM activities a
         INNER JOIN projects p ON a.project_id = p.id
         {FILTER_WHERE}
         ORDER BY a.timestamp ASC"
    );

    let mut stmt = conn.prepare(&select_sql)?;
    let rows = stmt
        .query_map((pid, from_ts, to_ts, context.as_deref()), map_activity_row)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(rows)
}
