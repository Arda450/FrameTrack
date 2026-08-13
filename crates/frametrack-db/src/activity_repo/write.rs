//! Schreiboperationen auf der Tabelle `activities`.

use crate::project_repo::project_exists;
use crate::DbError;
use frametrack_core::models::WindowActivity;
use rusqlite::{params, Connection};

/// Schreibt den dominanten Fenstertitel eines Aggregationsfensters.
pub fn insert_aggregated_activity_with_project(
    conn: &Connection,
    activity: &WindowActivity,
    project_id: i64,
    duration_seconds: u64,
) -> Result<(), DbError> {
    if !project_exists(conn, project_id)? {
        return Ok(());
    }

    conn.execute(
        "INSERT INTO activities
            (window_title, timestamp, project_id, duration_seconds, activity_type, context_key)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            activity.title,
            activity.timestamp as i64,
            project_id,
            duration_seconds as i64,
            activity.activity_type.key(),
            activity.context_key,
        ],
    )?;
    Ok(())
}

/// Löscht sämtliche Zeilen aus `activities`.
pub fn delete_all_activities(conn: &Connection) -> Result<usize, DbError> {
    let count = conn.execute("DELETE FROM activities", [])?;
    Ok(count)
}

/// Zählt alle Aktivitäten über alle Projekte.
pub fn count_activities(conn: &Connection) -> Result<i64, DbError> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM activities", [], |row| row.get(0))?;
    Ok(count)
}
