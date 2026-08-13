//! Aggregierte Statistikabfragen für Aktivitäten.

use crate::DbError;
use rusqlite::{Connection, OptionalExtension};

use super::types::{ActivityOverviewSummary, ProjectActivityTotal, ProjectStatsSummary};

/// Liefert appweite Kennzahlen, vollständig in SQLite aggregiert.
pub fn get_activity_overview_summary(
    conn: &Connection,
    today_start_ts: u64,
) -> Result<ActivityOverviewSummary, DbError> {
    let (count, first, active_days, total_seconds, today_seconds): (
        i64,
        Option<i64>,
        i64,
        i64,
        i64,
    ) = conn.query_row(
        "SELECT COUNT(*),
                MIN(timestamp),
                COUNT(DISTINCT date(timestamp, 'unixepoch', 'localtime')),
                COALESCE(SUM(duration_seconds), 0),
                COALESCE(SUM(CASE WHEN timestamp >= ?1 THEN duration_seconds ELSE 0 END), 0)
         FROM activities",
        [today_start_ts as i64],
        |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
            ))
        },
    )?;

    Ok(ActivityOverviewSummary {
        activity_count: count,
        total_active_seconds: total_seconds.max(0) as u64,
        today_active_seconds: today_seconds.max(0) as u64,
        active_days,
        first_activity_ts: first.map(|value| value.max(0) as u64),
    })
}

/// Liefert Kennzahlen für ein einzelnes Projekt in der Zeitstatistik Seitenleiste.
pub fn get_project_stats_summary(
    conn: &Connection,
    project_id: i64,
    today_start_ts: u64,
    recent_from_ts: u64,
    recent_to_ts: u64,
) -> Result<Option<ProjectStatsSummary>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT p.id,
                p.name,
                p.created_at,
                COUNT(a.id),
                MIN(a.timestamp),
                MAX(a.timestamp),
                COUNT(DISTINCT date(a.timestamp, 'unixepoch', 'localtime')),
                COALESCE(SUM(a.duration_seconds), 0),
                COALESCE(SUM(CASE WHEN a.timestamp >= ?2 THEN a.duration_seconds ELSE 0 END), 0),
                COALESCE(
                    SUM(
                        CASE
                            WHEN a.timestamp >= ?3 AND a.timestamp <= ?4 THEN a.duration_seconds
                            ELSE 0
                        END
                    ),
                    0
                )
         FROM projects p
         LEFT JOIN activities a ON a.project_id = p.id
         WHERE p.id = ?1
         GROUP BY p.id, p.name, p.created_at",
    )?;

    let summary = stmt
        .query_row(
            (
                project_id,
                today_start_ts as i64,
                recent_from_ts as i64,
                recent_to_ts as i64,
            ),
            |row| {
                let created_at: i64 = row.get(2)?;
                let first: Option<i64> = row.get(4)?;
                let last: Option<i64> = row.get(5)?;
                let total_seconds: i64 = row.get(7)?;
                let today_seconds: i64 = row.get(8)?;
                let recent_seconds: i64 = row.get(9)?;

                Ok(ProjectStatsSummary {
                    project_id: row.get(0)?,
                    name: row.get(1)?,
                    created_at: created_at.max(0) as u64,
                    activity_count: row.get(3)?,
                    first_activity_ts: first.map(|value| value.max(0) as u64),
                    last_activity_ts: last.map(|value| value.max(0) as u64),
                    active_days: row.get(6)?,
                    total_active_seconds: total_seconds.max(0) as u64,
                    today_active_seconds: today_seconds.max(0) as u64,
                    recent_active_seconds: recent_seconds.max(0) as u64,
                })
            },
        )
        .optional()?;

    Ok(summary)
}

/// Liefert Gesamt Sample Zeit je Projekt ohne Rohaktivitäten zu laden.
pub fn get_project_activity_totals(
    conn: &Connection,
) -> Result<Vec<ProjectActivityTotal>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT p.name,
                COALESCE(SUM(a.duration_seconds), 0) AS active_seconds
         FROM activities a
         INNER JOIN projects p ON a.project_id = p.id
         GROUP BY a.project_id, p.name
         ORDER BY active_seconds DESC",
    )?;
    let rows = stmt
        .query_map([], |row| {
            let seconds: i64 = row.get(1)?;
            Ok(ProjectActivityTotal {
                name: row.get(0)?,
                active_seconds: seconds.max(0) as u64,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}
